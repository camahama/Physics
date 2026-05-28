import pygame
import math
import sys

# --- Constants ---
GRID_WIDTH, GRID_HEIGHT = 600, 350 

# Colors
COLOR_BG = (0, 0, 0)
COLOR_UI_BG = (30, 30, 30)

# Matchar "Regndroppe"-färgerna
COLOR_GLASS = (30, 30, 90)       # Samma fyllning som dropparna
COLOR_OUTLINE = (200, 200, 220)  # Samma kantfärg som dropparna

class WaveRenderer:
    def __init__(self):
        self.width = GRID_WIDTH
        self.height = GRID_HEIGHT
        self.refractive_index = 1.0
        self.time = 0.0
        self.base_wavelength = 30.0
        self.frequency = 0.2
        self.beam_width = 50.0 
        self.boundary_slope = 0.0 # Default slope
        self.center_x = self.width // 2 - 20
        self.center_y = self.height // 2
        
        # Initiera vektorer
        self.update_vectors()
        
        self.pivot = (self.center_x, self.center_y)

    def set_refractive_index(self, n):
        self.refractive_index = n

    def set_slope(self, slope):
        self.boundary_slope = slope
        self.update_vectors()

    def update_vectors(self):
        # Linjevektor (tangent)
        # x = slope * y -> dy=1, dx=slope
        # Om slope är 0 (vertikal linje x=const? Nej, vänta)
        # Vår formel i loopen är: x < slope * (y-cy) + cx
        # Om slope = 0, blir det x < cx (Vertikal linje!)
        # Om slope = 0.4, blir det snett.
        
        l_len = math.hypot(self.boundary_slope, 1.0)
        self.tangent = (self.boundary_slope / l_len, 1.0 / l_len)
        
        # Normalvektor (pekar in i glaset, åt höger)
        # Roterad -90 deg från tangenten -> (1, -slope)
        self.normal = (1.0 / l_len, -self.boundary_slope / l_len)

    def update(self):
        self.time += self.frequency

    def render(self, surface):
        pixels = pygame.PixelArray(surface)
        w = self.width
        h = self.height
        n2 = self.refractive_index
        t = self.time
        k0 = (2 * math.pi) / self.base_wavelength
        
        k1_x, k1_y = k0, 0.0
        kt = k0 * self.tangent[0]
        k_glass_mag = n2 * k0
        kn_sq = k_glass_mag**2 - kt**2
        if kn_sq < 0: kn_sq = 0
        kn = math.sqrt(kn_sq)
        
        k2_x = kt * self.tangent[0] + kn * self.normal[0]
        k2_y = kt * self.tangent[1] + kn * self.normal[1]
        
        k2_len = math.hypot(k2_x, k2_y)
        # dir2 används för att beräkna strålbredden i glaset
        if k2_len > 0:
            dir2_x = k2_x / k2_len
            dir2_y = k2_y / k2_len
        else:
            dir2_x, dir2_y = 1.0, 0.0 # Fallback
        
        slope = self.boundary_slope
        cx, cy = self.center_x, self.center_y
        pivot_x, pivot_y = self.pivot
        
        for y in range(h):
            y_rel = y - cy
            boundary_x_at_y = slope * y_rel + cx
            dy = y - pivot_y
            
            for x in range(w):
                dx = x - pivot_x
                if x < boundary_x_at_y:
                    phase = k1_x * dx + k1_y * dy - t
                    dist_from_beam = abs(y - cy)
                    bg_col = COLOR_BG
                else:
                    phase = k2_x * dx + k2_y * dy - t
                    dist_from_beam = abs(dx * dir2_y - dy * dir2_x)
                    bg_col = COLOR_GLASS

                val = math.sin(phase)
                wave_intensity = max(0.0, val)
                
                if dist_from_beam > self.beam_width:
                    fade = max(0.0, 1.0 - (dist_from_beam - self.beam_width) / 10.0)
                    wave_intensity *= fade
                
                if wave_intensity > 0.05:
                    w_int = int(wave_intensity * 255)
                    r = min(255, bg_col[0] + 0)
                    g = min(255, bg_col[1] + w_int)
                    b = min(255, bg_col[2] + w_int // 3)
                    pixels[x, y] = (r, g, b)
                else:
                    pixels[x, y] = bg_col
        pixels.close()
        
        # Rita gränslinjen (kanten)
        # y_start, y_end = 0, h
        # x_start = slope * (y_start - cy) + cx
        # x_end = slope * (y_end - cy) + cx
        
        # pygame.draw.line(surface, COLOR_OUTLINE, (x_start, y_start), (x_end, y_end), 2)

def main(screen=None):
    if screen is None:
        pygame.init()
        screen = pygame.display.set_mode((1200, 700), pygame.RESIZABLE)
        
    pygame.display.set_caption("Vågbrytning: Simulering")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("Arial", 18)
    
    renderer = WaveRenderer()
    sim_surface = pygame.Surface((GRID_WIDTH, GRID_HEIGHT))
    
    # UI Elements
    back_btn_rect = pygame.Rect(10, 10, 100, 40)
    
    # Knapp för att byta vinkel
    toggle_btn_rect = pygame.Rect(20, 0, 120, 40) # Y-pos sätts dynamiskt
    current_slope_mode = "Rak"

    def get_slider_rect(w, h):
        return pygame.Rect(200, h - 60, max(100, w - 400), 10)

    win_w, win_h = screen.get_width(), screen.get_height()
    slider_rect = get_slider_rect(win_w, win_h)
    toggle_btn_rect.y = win_h - 75 # Placera knappen i UI-panelen
    
    dragging = False
    
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
                
            elif event.type == pygame.VIDEORESIZE:
                win_w, win_h = event.w, event.h
                slider_rect = get_slider_rect(win_w, win_h)
                toggle_btn_rect.y = win_h - 75

            elif event.type == pygame.MOUSEBUTTONDOWN:
                mx, my = event.pos
                
                if back_btn_rect.collidepoint((mx, my)):
                    running = False
                
                # Klick på Toggle-knappen
                if toggle_btn_rect.collidepoint((mx, my)):
                    if current_slope_mode == "Sned":
                        renderer.set_slope(0.0) # Rakt (vertikalt)
                        current_slope_mode = "Rak"
                    else:
                        renderer.set_slope(0.4) # Snett
                        current_slope_mode = "Sned"
                
                if slider_rect.collidepoint(mx, my) or abs(my - slider_rect.centery) < 20:
                    if slider_rect.left <= mx <= slider_rect.right:
                        dragging = True
                        mx = max(slider_rect.left, min(slider_rect.right, mx))
                        ratio = (mx - slider_rect.left) / slider_rect.width
                        new_n = 1.0 + ratio * 2.0
                        renderer.set_refractive_index(new_n)
            
            elif event.type == pygame.MOUSEBUTTONUP:
                dragging = False
                
            elif event.type == pygame.MOUSEMOTION:
                if dragging:
                    mx = event.pos[0]
                    mx = max(slider_rect.left, min(slider_rect.right, mx))
                    ratio = (mx - slider_rect.left) / slider_rect.width
                    new_n = 1.0 + ratio * 2.0
                    renderer.set_refractive_index(new_n)

        renderer.update()
        renderer.render(sim_surface)
        
        ui_height = 100
        render_h = max(1, win_h - ui_height)
        scaled_surf = pygame.transform.scale(sim_surface, (win_w, render_h))
        
        screen.fill(COLOR_BG)
        screen.blit(scaled_surf, (0, 0))
        
        # UI Panel
        pygame.draw.rect(screen, COLOR_UI_BG, (0, win_h - ui_height, win_w, ui_height))
        
        # Toggle Button
        pygame.draw.rect(screen, (80, 80, 100), toggle_btn_rect, border_radius=5)
        toggle_txt = font.render(f"Gräns: {current_slope_mode}", True, (255, 255, 255))
        screen.blit(toggle_txt, (toggle_btn_rect.centerx - toggle_txt.get_width()//2, toggle_btn_rect.centery - toggle_txt.get_height()//2))

        # Slider
        pygame.draw.rect(screen, (100, 100, 100), slider_rect, border_radius=5)
        ratio = (renderer.refractive_index - 1.0) / 2.0
        knob_x = slider_rect.x + int(ratio * slider_rect.width)
        pygame.draw.circle(screen, (255, 255, 255), (knob_x, slider_rect.centery), 12)
        
        lbl_n = font.render(f"Brytningsindex (n): {renderer.refractive_index:.2f}", True, (255, 255, 255))
        screen.blit(lbl_n, (win_w//2 - lbl_n.get_width()//2, slider_rect.y - 30))
        
        screen.blit(font.render("1.0 (Luft)", True, (150,150,150)), (slider_rect.x, slider_rect.bottom + 5))
        screen.blit(font.render("3.0 (Segt)", True, (150,150,150)), (slider_rect.right - 60, slider_rect.bottom + 5))
        
        # Back Button
        pygame.draw.rect(screen, (150, 50, 50), back_btn_rect, border_radius=5)
        back_txt = font.render("Meny", True, (255, 255, 255))
        screen.blit(back_txt, (back_btn_rect.centerx - back_txt.get_width()//2, back_btn_rect.centery - back_txt.get_height()//2))

        pygame.display.flip()
        clock.tick(60)

    return

if __name__ == "__main__":
    main()