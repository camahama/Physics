import pygame
import math
import sys

# --- Konstanter ---
WIDTH, HEIGHT = 1200, 800
BACKGROUND_COLOR = (5, 5, 5) 
DROP_CENTER = (WIDTH // 2, 200)
DROP_RADIUS = 23 

WHITE = (255, 255, 255)
GRAY = (100, 100, 100)
BUTTON_COLOR = (50, 50, 80)
BUTTON_ACTIVE_COLOR = (80, 100, 80)
BUTTON_CLEAR_COLOR = (100, 50, 50) 
DROP_FILL_COLOR = (20, 20, 60)
DROP_OUTLINE_COLOR = (200, 200, 220)

RAINBOW_DATA = [
    {"name": "Röd",    "rgb": (255, 0, 0),     "n": 1.331},
    {"name": "Orange", "rgb": (255, 127, 0),   "n": 1.333},
    {"name": "Gul",    "rgb": (255, 255, 0),   "n": 1.335},
    {"name": "Grön",   "rgb": (0, 255, 0),     "n": 1.338},
    {"name": "Blå",    "rgb": (0, 0, 255),     "n": 1.343},
    {"name": "Indigo", "rgb": (75, 0, 130),    "n": 1.345},
    {"name": "Violett", "rgb": (148, 0, 211),   "n": 1.348},
]

def calculate_ray_path_from_bottom(x_offset, n_color, num_reflections):
    points = []
    start_x = DROP_CENTER[0] + x_offset
    start_y = HEIGHT
    points.append((start_x, start_y))
    
    # 1. Träffpunkt
    if abs(x_offset) > DROP_RADIUS * 0.999: 
        return [] 
    
    dy_entry = math.sqrt(DROP_RADIUS**2 - x_offset**2)
    entry_x = start_x
    entry_y = DROP_CENTER[1] + dy_entry
    points.append((entry_x, entry_y))

    # 2. Snells lag (in)
    try: 
        alpha = math.asin(x_offset / DROP_RADIUS)
    except ValueError: 
        return []

    sin_beta = (1.0003 / n_color) * math.sin(alpha)
    if abs(sin_beta) > 1: return [] 
    
    beta = math.asin(sin_beta)
    theta_current = math.atan2(dy_entry, x_offset)
    
    # Rotation per studs
    rotation_step = -(math.pi - 2 * beta)

    # 3. Interna reflektioner
    for _ in range(num_reflections):
        theta_current += rotation_step
        ref_x = DROP_CENTER[0] + DROP_RADIUS * math.cos(theta_current)
        ref_y = DROP_CENTER[1] + DROP_RADIUS * math.sin(theta_current)
        points.append((ref_x, ref_y))
        
    # 4. Utgång
    theta_current += rotation_step
    exit_x = DROP_CENTER[0] + DROP_RADIUS * math.cos(theta_current)
    exit_y = DROP_CENTER[1] + DROP_RADIUS * math.sin(theta_current)
    points.append((exit_x, exit_y))
    
    # 5. Utgående stråle
    final_ray_angle = theta_current - alpha
    end_x = exit_x + 3000 * math.cos(final_ray_angle) 
    end_y = exit_y + 3000 * math.sin(final_ray_angle)
    points.append((end_x, end_y))
    
    return points

def draw_buttons(surface, font, primary_visible, secondary_visible):
    buttons = []
    start_x = 20
    start_y = 20
    
    # Primär
    p_text = f"Primär: {'RENSA' if primary_visible else 'STARTA'}"
    surf = font.render(p_text, True, WHITE)
    rect = pygame.Rect(start_x, start_y, surf.get_width() + 20, 35)
    color = BUTTON_CLEAR_COLOR if primary_visible else BUTTON_COLOR
    pygame.draw.rect(surface, color, rect, border_radius=5)
    pygame.draw.rect(surface, GRAY, rect, 2, border_radius=5)
    surface.blit(surf, (rect.x + 10, rect.y + 8))
    buttons.append({"rect": rect, "action": "toggle_primary"})
    
    start_x += rect.width + 20
    
    # Sekundär
    s_text = f"Sekundär: {'RENSA' if secondary_visible else 'STARTA'}"
    surf = font.render(s_text, True, WHITE)
    rect = pygame.Rect(start_x, start_y, surf.get_width() + 20, 35)
    color = BUTTON_CLEAR_COLOR if secondary_visible else BUTTON_COLOR
    pygame.draw.rect(surface, color, rect, border_radius=5)
    pygame.draw.rect(surface, GRAY, rect, 2, border_radius=5)
    surface.blit(surf, (rect.x + 10, rect.y + 8))
    buttons.append({"rect": rect, "action": "toggle_secondary"})
    
    start_x += rect.width + 30
    
    # Meny
    back_text = "Meny"
    surf = font.render(back_text, True, WHITE)
    rect = pygame.Rect(start_x, start_y, 80, 35)
    pygame.draw.rect(surface, (150, 50, 50), rect, border_radius=5)
    surface.blit(surf, (rect.centerx - surf.get_width()//2, rect.centery - surf.get_height()//2))
    buttons.append({"rect": rect, "action": "back"})
    
    return buttons

def main(screen=None):
    if screen is None:
        pygame.init()
        screen = pygame.display.set_mode((1200, 800), pygame.RESIZABLE)
    
    pygame.display.set_caption("Regndroppe (Avancerad)")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("Arial", 16)
    
    # Huvudcanvas
    canvas = pygame.Surface((WIDTH, HEIGHT))
    
    # --- SEPARATA LAGER FÖR PRIMÄR OCH SEKUNDÄR ---
    # Vi ritar på dessa ytor. De är transparenta från början.
    # Genom att ha dem separata kan vi sänka ljusstyrkan på HELA sekundärlagret på slutet.
    primary_layer = pygame.Surface((WIDTH, HEIGHT))
    secondary_layer = pygame.Surface((WIDTH, HEIGHT))
    
    # State
    animating_primary = False
    primary_visible = False 
    p_offset = -DROP_RADIUS * 0.98 # Starta långt till vänster
    
    animating_secondary = False
    secondary_visible = False
    s_offset = -DROP_RADIUS * 0.98
    
    # Hastighet
    step_size = 0.2
    rays_per_frame = 1
    
    buttons = []

    # Initiera lagren till svart (som funkar som transparent i BLEND_ADD)
    primary_layer.fill((0,0,0))
    secondary_layer.fill((0,0,0))

    running = True
    win_w, win_h = screen.get_width(), screen.get_height()

    while running:
        # Skalning (Letterboxing)
        scale = min(win_w / WIDTH, win_h / HEIGHT)
        new_w = int(WIDTH * scale)
        new_h = int(HEIGHT * scale)
        offset_x = (win_w - new_w) // 2
        offset_y = (win_h - new_h) // 2

        # Events
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
                        
                        for btn in buttons:
                            if btn["rect"].collidepoint((logical_mx, logical_my)):
                                if btn["action"] == "toggle_primary":
                                    if primary_visible:
                                        animating_primary = False; primary_visible = False
                                        primary_layer.fill((0,0,0)) # Rensa lagret
                                    else:
                                        animating_primary = True; primary_visible = True
                                        p_offset = -DROP_RADIUS * 0.98 # Starta om från vänster
                                        primary_layer.fill((0,0,0))
                                
                                elif btn["action"] == "toggle_secondary":
                                    if secondary_visible:
                                        animating_secondary = False; secondary_visible = False
                                        secondary_layer.fill((0,0,0))
                                    else:
                                        animating_secondary = True; secondary_visible = True
                                        s_offset = -DROP_RADIUS * 0.98
                                        secondary_layer.fill((0,0,0))
                                
                                elif btn["action"] == "back":
                                    running = False

        # --- ANIMATION LOGIK ---
        
        # Primär Regnbåge
        if animating_primary:
            for _ in range(rays_per_frame):
                # Skanna hela droppen (-R till +R)
                if p_offset > DROP_RADIUS * 0.98:
                    animating_primary = False
                    break
                
                # Rita varje färg. 
                # Vi använder reversed() för att rita Violett sist (överst?) eller tvärtom
                # beroende på vad som ser bäst ut. 
                for data in reversed(RAINBOW_DATA):
                    # Stark intensitet för primär (alpha 40)
                    col = (*data["rgb"], 40)
                    path = calculate_ray_path_from_bottom(p_offset, data["n"], 1)
                    if len(path) >= 2:
                        # Rita på ett temporärt lager för att få alpha-blandningen korrekt innan add
                        # Eller rita direkt på lagret om vi litar på additiv blandning.
                        # Vi ritar direkt på primary_layer men vi måste "fuska" med alpha
                        # eftersom draw.lines inte stödjer alpha direkt.
                        # Vi skapar en temp surface.
                        
                        temp = pygame.Surface((WIDTH, HEIGHT))
                        # Vi fyller inte temp, den är svart (0,0,0) som är transparent vid ADD
                        pygame.draw.lines(temp, col, False, path, 1)
                        primary_layer.blit(temp, (0,0), special_flags=pygame.BLEND_ADD)
                
                p_offset += step_size

        # Sekundär Regnbåge
        if animating_secondary:
            for _ in range(rays_per_frame):
                if s_offset > DROP_RADIUS * 0.98:
                    animating_secondary = False
                    break
                
                for data in reversed(RAINBOW_DATA):
                    # Vi ritar med ganska stark färg här (alpha 40),
                    # MEN vi kommer dämpa hela lagret senare!
                    col = (*data["rgb"], 40)
                    path = calculate_ray_path_from_bottom(s_offset, data["n"], 2)
                    if len(path) >= 2:
                        temp = pygame.Surface((WIDTH, HEIGHT))
                        pygame.draw.lines(temp, col, False, path, 1)
                        secondary_layer.blit(temp, (0,0), special_flags=pygame.BLEND_ADD)
                
                s_offset += step_size

        # --- RENDERING TILL HUVUDCANVAS ---
        canvas.fill(BACKGROUND_COLOR)
        
        # Rita Droppe
        pygame.draw.circle(canvas, DROP_FILL_COLOR, DROP_CENTER, DROP_RADIUS)
        pygame.draw.circle(canvas, DROP_OUTLINE_COLOR, DROP_CENTER, DROP_RADIUS, 2)
        
        # Lägg på Primärt lager (Full styrka)
        canvas.blit(primary_layer, (0,0), special_flags=pygame.BLEND_ADD)
        
        # Lägg på Sekundärt lager (DÄMPAD STYRKA)
        # Vi skapar en kopia för att kunna sätta alpha utan att förstöra originalet?
        # Nej, vi kan blitta secondary_layer med en global alpha modifierare?
        # Tyvärr stödjer blit inte både special_flags (ADD) och alpha samtidigt på ett enkelt sätt.
        # Lösning: Vi justerar intensiteten genom att multiplicera lagret med mörkt grått innan add.
        
        if secondary_visible:
            # Skapa en dämpad kopia
            dimmed_secondary = secondary_layer.copy()
            # Fyll en vit yta med låg alpha (t.ex. 80 av 255 = ca 30%)
            # Och multiplicera (BLEND_MULT) för att mörka ner
            dimmer = pygame.Surface((WIDTH, HEIGHT))
            dimmer.fill((80, 80, 80)) # Ju mörkare grå, desto svagare blir regnbågen
            dimmed_secondary.blit(dimmer, (0,0), special_flags=pygame.BLEND_MULT)
            
            # Nu lägger vi till den dämpade versionen
            canvas.blit(dimmed_secondary, (0,0), special_flags=pygame.BLEND_ADD)

        # Rita UI
        buttons = draw_buttons(canvas, font, primary_visible, secondary_visible)

        # Skala och rita på skärmen
        screen.fill(BACKGROUND_COLOR)
        scaled_surf = pygame.transform.scale(canvas, (new_w, new_h))
        screen.blit(scaled_surf, (offset_x, offset_y))
        
        pygame.display.flip()
        clock.tick(60)
        
    return

if __name__ == "__main__":
    main()