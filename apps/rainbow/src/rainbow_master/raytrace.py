import pygame
import math
import sys

# --- Constants ---
INTERNAL_WIDTH, INTERNAL_HEIGHT = 1200, 800
BACKGROUND_COLOR = (10, 15, 20) 

# Drop settings
DROP_CENTER = (INTERNAL_WIDTH // 2, INTERNAL_HEIGHT // 2)
DROP_RADIUS = 250 

# Physics
N_AIR = 1.00
N_WATER = 1.333
MAX_DEPTH = 12 
MIN_INTENSITY = 0.001 # Sänkt gräns för att fånga svagare strålar

# Colors
COLOR_BEAM = (255, 255, 230) 
DROP_FILL_COLOR = (20, 30, 50)
DROP_OUTLINE_COLOR = (100, 150, 200)

class RaySegment:
    def __init__(self, start, end, intensity, width=1):
        self.start = start
        self.end = end
        self.intensity = intensity
        self.width = width

def vec_add(v1, v2): return (v1[0] + v2[0], v1[1] + v2[1])
def vec_sub(v1, v2): return (v1[0] - v2[0], v1[1] - v2[1])
def vec_mul(v, s): return (v[0] * s, v[1] * s)
def vec_len(v): return math.hypot(v[0], v[1])
def vec_norm(v):
    l = vec_len(v)
    return (v[0]/l, v[1]/l) if l > 0 else (0, 0)
def vec_dot(v1, v2): return v1[0]*v2[0] + v1[1]*v2[1]

def intersect_ray_circle(ray_origin, ray_dir, circle_center, radius):
    oc = vec_sub(ray_origin, circle_center)
    a = vec_dot(ray_dir, ray_dir)
    b = 2.0 * vec_dot(oc, ray_dir)
    c = vec_dot(oc, oc) - radius*radius
    discriminant = b*b - 4*a*c
    
    if discriminant < 0:
        return None
    else:
        sqrt_disc = math.sqrt(discriminant)
        t1 = (-b - sqrt_disc) / (2*a)
        t2 = (-b + sqrt_disc) / (2*a)
        epsilon = 0.001
        if t1 > epsilon: return t1
        if t2 > epsilon: return t2
        return None

def fresnel(n1, n2, cos_i, cos_t):
    # Fullständiga Fresnel-ekvationer för opolariserat ljus
    if n1 == n2: return 0.0
    
    rs_num = n1 * cos_i - n2 * cos_t
    rs_den = n1 * cos_i + n2 * cos_t
    rs = (rs_num / rs_den) ** 2
    
    rp_num = n1 * cos_t - n2 * cos_i
    rp_den = n1 * cos_t + n2 * cos_i
    rp = (rp_num / rp_den) ** 2
    
    return 0.5 * (rs + rp)

def trace_rays_recursive(start_pos, direction, intensity, current_n, segments, depth):
    if depth > MAX_DEPTH or intensity < MIN_INTENSITY:
        end_pos = vec_add(start_pos, vec_mul(direction, 100))
        segments.append(RaySegment(start_pos, end_pos, intensity * 0.5)) 
        return

    t = intersect_ray_circle(start_pos, direction, DROP_CENTER, DROP_RADIUS)
    
    if t is None:
        end_pos = vec_add(start_pos, vec_mul(direction, 2000))
        segments.append(RaySegment(start_pos, end_pos, intensity))
        return

    hit_point = vec_add(start_pos, vec_mul(direction, t))
    segments.append(RaySegment(start_pos, hit_point, intensity))
    
    normal = vec_norm(vec_sub(hit_point, DROP_CENTER))
    cos_incident = vec_dot(direction, normal)
    
    if abs(cos_incident) < 0.001:
         return 

    entering = cos_incident < 0
    
    if entering:
        n1, n2 = N_AIR, N_WATER
        effective_normal = normal
        cos_i = -cos_incident
    else:
        n1, n2 = N_WATER, N_AIR
        effective_normal = vec_mul(normal, -1) 
        cos_i = cos_incident 
        
    sin_i2 = 1.0 - cos_i**2
    eta = n1 / n2
    sin_t2 = eta**2 * sin_i2
    
    nudge_dist = 0.1
    
    if sin_t2 > 1.0:
        # Totalreflektion (TIR)
        refl_dir = vec_sub(direction, vec_mul(effective_normal, 2 * vec_dot(direction, effective_normal)))
        refl_start = vec_add(hit_point, vec_mul(effective_normal, nudge_dist)) 
        trace_rays_recursive(refl_start, refl_dir, intensity, current_n, segments, depth + 1)
    else:
        cos_t = math.sqrt(1.0 - sin_t2)
        
        # FYSIKALISKT KORREKT (R + T = 1)
        R = fresnel(n1, n2, cos_i, cos_t)
        T = 1.0 - R
        
        # Reflektion
        refl_dir = vec_sub(direction, vec_mul(effective_normal, 2 * vec_dot(direction, effective_normal)))
        refl_start = vec_add(hit_point, vec_mul(effective_normal, nudge_dist))
        trace_rays_recursive(refl_start, refl_dir, intensity * R, current_n, segments, depth + 1)
        
        # Refraktion (Transmission)
        term = eta * cos_i - cos_t
        refr_dir = vec_add(vec_mul(direction, eta), vec_mul(effective_normal, term))
        refr_start = vec_add(hit_point, vec_mul(effective_normal, -nudge_dist))
        trace_rays_recursive(refr_start, refr_dir, intensity * T, n2, segments, depth + 1)

def main(screen=None):
    if screen is None:
        pygame.init()
        screen = pygame.display.set_mode((1200, 800), pygame.RESIZABLE)
        
    pygame.display.set_caption("Realistisk Strålgång (Fresnel)")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("Arial", 16)
    
    canvas = pygame.Surface((INTERNAL_WIDTH, INTERNAL_HEIGHT))
    
    input_x_offset = -400.0 
    dragging = False
    
    btn_back = pygame.Rect(INTERNAL_WIDTH - 120, 20, 100, 35)

    running = True
    win_w, win_h = screen.get_width(), screen.get_height()

    while running:
        scale = min(win_w / INTERNAL_WIDTH, win_h / INTERNAL_HEIGHT)
        new_w = int(INTERNAL_WIDTH * scale)
        new_h = int(INTERNAL_HEIGHT * scale)
        offset_x = (win_w - new_w) // 2
        offset_y = (win_h - new_h) // 2

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.VIDEORESIZE:
                win_w, win_h = event.w, event.h
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    mx, my = event.pos
                    if offset_x <= mx < offset_x + new_w and offset_y <= my < offset_y + new_h:
                        logical_mx = (mx - offset_x) / scale
                        logical_my = (my - offset_y) / scale
                        if btn_back.collidepoint((logical_mx, logical_my)):
                            running = False
                        else:
                            dragging = True
            elif event.type == pygame.MOUSEBUTTONUP:
                dragging = False
        
        if dragging:
            mx, my = pygame.mouse.get_pos()
            if new_w > 0:
                internal_mx = (mx - offset_x) / scale
                rel_x = internal_mx - DROP_CENTER[0]
                input_x_offset = rel_x 

        segments = []
        start_pt = (DROP_CENTER[0] + input_x_offset, INTERNAL_HEIGHT)
        start_dir = (0, -1) 
        
        # Starta med 1.0 (normaliserad intensitet) eftersom vi nu skalar upp visuellt
        trace_rays_recursive(start_pt, start_dir, 1.0, N_AIR, segments, 0)

        canvas.fill(BACKGROUND_COLOR)
        pygame.draw.circle(canvas, DROP_FILL_COLOR, DROP_CENTER, DROP_RADIUS)
        pygame.draw.circle(canvas, DROP_OUTLINE_COLOR, DROP_CENTER, DROP_RADIUS, 2)
        
        ray_layer = pygame.Surface((INTERNAL_WIDTH, INTERNAL_HEIGHT))
        ray_layer.fill((0, 0, 0))
        
        for seg in segments:
            # --- KVADRATROTS-SKALNING (Gamma-korrigering) ---
            # Detta lyfter fram svaga strålar rejält utan att övermätta de starka.
            # sqrt(0.04) = 0.2 -> 4% intensitet visas som 20% ljusstyrka
            # sqrt(1.0) = 1.0
            
            visual_intensity = math.sqrt(seg.intensity)
            
            # Klipp vid 1.0
            visual_intensity = min(1.0, visual_intensity)

            draw_col = (
                int(COLOR_BEAM[0] * visual_intensity),
                int(COLOR_BEAM[1] * visual_intensity),
                int(COLOR_BEAM[2] * visual_intensity)
            )
            
            # Rita bara om det är synligt
            if visual_intensity > 0.05:
                pygame.draw.line(ray_layer, draw_col, seg.start, seg.end, 3) 

        canvas.blit(ray_layer, (0, 0), special_flags=pygame.BLEND_ADD)
        
        title = font.render("Realistisk Strålgång (Fysikaliskt Korrekt R+T=1)", True, (200, 200, 200))
        canvas.blit(title, (20, 20))
        hint = font.render("Dra med musen för att flytta ljuskällan.", True, (150, 150, 150))
        canvas.blit(hint, (20, 50))
        src_pos = (DROP_CENTER[0] + input_x_offset, INTERNAL_HEIGHT - 20)
        pygame.draw.circle(canvas, (255, 255, 200), (int(src_pos[0]), int(src_pos[1])), 8)

        mx, my = pygame.mouse.get_pos()
        log_mx = (mx - offset_x) / scale if scale > 0 else -1000
        log_my = (my - offset_y) / scale if scale > 0 else -1000
        
        back_col = (180, 50, 50) if btn_back.collidepoint((log_mx, log_my)) else (150, 50, 50)
        pygame.draw.rect(canvas, back_col, btn_back, border_radius=5)
        back_txt = font.render("Meny", True, (255, 255, 255))
        canvas.blit(back_txt, (btn_back.centerx - back_txt.get_width()//2, btn_back.centery - back_txt.get_height()//2))

        screen.fill(BACKGROUND_COLOR)
        scaled_surf = pygame.transform.scale(canvas, (new_w, new_h))
        screen.blit(scaled_surf, (offset_x, offset_y))

        pygame.display.flip()
        clock.tick(60)
        
    return

if __name__ == "__main__":
    main()