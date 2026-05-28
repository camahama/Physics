import pygame
import math
import sys

# --- Constants ---
INTERNAL_WIDTH, INTERNAL_HEIGHT = 1200, 800
BACKGROUND_COLOR = (20, 20, 20)
UI_WIDTH = 250

WHITE = (255, 255, 255)
GRAY = (100, 100, 100)
BUTTON_COLOR = (50, 50, 80)
BUTTON_HOVER_COLOR = (70, 70, 100)
BUTTON_ACTIVE_COLOR = (80, 100, 80)
DROP_FILL_COLOR = (20, 20, 60)   
DROP_OUTLINE_COLOR = (200, 200, 220) 

RAINBOW_DATA = [
    {"name": "Röd",    "rgb": (255, 0, 0),     "n": 1.331},
    {"name": "Orange", "rgb": (255, 127, 0),   "n": 1.333},
    {"name": "Gul", "rgb": (255, 255, 0),   "n": 1.335},
    {"name": "Grön",  "rgb": (0, 255, 0),     "n": 1.338},
    {"name": "Blå",   "rgb": (0, 0, 255),     "n": 1.343},
    {"name": "Indigo", "rgb": (75, 0, 130),    "n": 1.345},
    {"name": "Violett", "rgb": (148, 0, 211),   "n": 1.348},
]

class SimulationState:
    def __init__(self):
        self.visible_flags = [False] * 7
        self.focused_index = 0
        self.impact_primary = [100.0] * 7 
        self.impact_secondary = [100.0] * 7
        self.is_dragging = False
        self.show_primary = True
        self.show_secondary = False

def get_layout(current_w, current_h):
    ui_x = current_w - UI_WIDTH
    drop_center = (ui_x // 2, current_h // 2)
    max_radius_w = (ui_x - 50) // 6
    max_radius_h = current_h // 7.5
    drop_radius = int(min(max_radius_w, max_radius_h))
    return ui_x, drop_center, drop_radius

def calculate_ray_path_from_bottom(x_offset, n_color, drop_center, drop_radius, screen_height, num_reflections):
    points = []
    start_x = drop_center[0] + x_offset
    start_y = screen_height
    points.append((start_x, start_y))
    if abs(x_offset) > drop_radius:
        points.append((start_x, 0))
        return points, None 
    dy_entry = math.sqrt(drop_radius**2 - x_offset**2)
    entry_x = start_x
    entry_y = drop_center[1] + dy_entry
    points.append((entry_x, entry_y))
    try:
        alpha = math.asin(x_offset / drop_radius)
    except ValueError:
        return points, None
    sin_beta = (1.0003 / n_color) * math.sin(alpha)
    if abs(sin_beta) > 1: return points, None 
    beta = math.asin(sin_beta)
    theta_current = math.atan2(dy_entry, x_offset)
    rotation_step = -(math.pi - 2 * beta)
    for _ in range(num_reflections):
        theta_current += rotation_step
        ref_x = drop_center[0] + drop_radius * math.cos(theta_current)
        ref_y = drop_center[1] + drop_radius * math.sin(theta_current)
        points.append((ref_x, ref_y))
    theta_current += rotation_step
    exit_x = drop_center[0] + drop_radius * math.cos(theta_current)
    exit_y = drop_center[1] + drop_radius * math.sin(theta_current)
    points.append((exit_x, exit_y))
    final_ray_angle = theta_current - alpha
    end_x = exit_x + 2000 * math.cos(final_ray_angle)
    end_y = exit_y + 2000 * math.sin(final_ray_angle)
    points.append((end_x, end_y))
    alpha_deg = math.degrees(abs(alpha))
    beta_deg = math.degrees(abs(beta))
    if num_reflections == 1: calc_deviation = 4 * beta_deg - 2 * alpha_deg
    else: calc_deviation = 180 + 2 * alpha_deg - 6 * beta_deg
    return points, abs(calc_deviation)

def draw_ui_right_panel(screen, state, font, ui_x_start, screen_height):
    pygame.draw.rect(screen, (40, 40, 40), (ui_x_start, 0, UI_WIDTH, screen_height))
    pygame.draw.line(screen, GRAY, (ui_x_start, 0), (ui_x_start, screen_height), 2)
    title = font.render("Colors", True, WHITE)
    screen.blit(title, (ui_x_start + 20, 20))
    start_y = 60
    spacing = 50
    l1 = font.render("Vis", True, GRAY)
    l2 = font.render("Control", True, GRAY)
    screen.blit(l1, (ui_x_start + 10, start_y - 20))
    screen.blit(l2, (ui_x_start + 60, start_y - 20))
    for i, data in enumerate(RAINBOW_DATA):
        y_pos = start_y + i * spacing
        checkbox_rect = pygame.Rect(ui_x_start + 10, y_pos, 20, 20)
        pygame.draw.rect(screen, GRAY, checkbox_rect, 2)
        if state.visible_flags[i]:
            pygame.draw.rect(screen, data["rgb"], (checkbox_rect.x+4, checkbox_rect.y+4, 12, 12))
        radio_center = (ui_x_start + 80, y_pos + 10)
        pygame.draw.circle(screen, GRAY, radio_center, 10, 2)
        if state.focused_index == i:
            pygame.draw.circle(screen, WHITE, radio_center, 6)
        color_name = font.render(data["name"], True, data["rgb"])
        screen.blit(color_name, (ui_x_start + 110, y_pos))
    inst_y = screen_height - 120
    lines = ["Drag Left side", "for Primary.", "Drag Right side", "for Secondary."]
    for idx, line in enumerate(lines):
        inst_surf = font.render(line, True, GRAY)
        screen.blit(inst_surf, (ui_x_start + 10, inst_y + (idx*20)))

def draw_top_controls(screen, state, font):
    buttons = []
    start_x = 20
    start_y = 20
    p_text = f"Primär: {'PÅ' if state.show_primary else 'AV'}"
    surf = font.render(p_text, True, WHITE if state.show_primary else GRAY)
    rect = pygame.Rect(start_x, start_y, surf.get_width() + 20, 35)
    color = BUTTON_ACTIVE_COLOR if state.show_primary else BUTTON_COLOR
    pygame.draw.rect(screen, color, rect, border_radius=5)
    pygame.draw.rect(screen, GRAY, rect, 2, border_radius=5)
    screen.blit(surf, (rect.x + 10, rect.y + 8))
    buttons.append({"rect": rect, "action": "toggle_primary"})
    start_x += rect.width + 20
    s_text = f"Sekundär: {'PÅ' if state.show_secondary else 'AV'}"
    surf = font.render(s_text, True, WHITE if state.show_secondary else GRAY)
    rect = pygame.Rect(start_x, start_y, surf.get_width() + 20, 35)
    color = BUTTON_ACTIVE_COLOR if state.show_secondary else BUTTON_COLOR
    pygame.draw.rect(screen, color, rect, border_radius=5)
    pygame.draw.rect(screen, GRAY, rect, 2, border_radius=5)
    screen.blit(surf, (rect.x + 10, rect.y + 8))
    buttons.append({"rect": rect, "action": "toggle_secondary"})
    start_x += rect.width + 20
    opt_text = "Optimera"
    surf = font.render(opt_text, True, WHITE)
    rect = pygame.Rect(start_x, start_y, surf.get_width() + 20, 35)
    pygame.draw.rect(screen, BUTTON_COLOR, rect, border_radius=5)
    pygame.draw.rect(screen, GRAY, rect, 2, border_radius=5)
    screen.blit(surf, (rect.x + 10, rect.y + 8))
    buttons.append({"rect": rect, "action": "set_optimal"})
    
    # Back Button
    start_x += rect.width + 30
    back_text = "Meny"
    surf = font.render(back_text, True, WHITE)
    rect = pygame.Rect(start_x, start_y, 80, 35)
    pygame.draw.rect(screen, (150, 50, 50), rect, border_radius=5)
    screen.blit(surf, (rect.centerx - surf.get_width()//2, rect.centery - surf.get_height()//2))
    buttons.append({"rect": rect, "action": "back"})
    return buttons

def handle_click(pos, state, ui_x_start, top_buttons, drop_radius):
    x, y = pos
    for btn in top_buttons:
        if btn["rect"].collidepoint(pos):
            if btn["action"] == "toggle_primary": state.show_primary = not state.show_primary
            elif btn["action"] == "toggle_secondary": state.show_secondary = not state.show_secondary
            elif btn["action"] == "set_optimal":
                for i, data in enumerate(RAINBOW_DATA):
                    n = data["n"]
                    if 4 - n**2 > 0: state.impact_primary[i] = drop_radius * math.sqrt((4 - n**2) / 3)
                    if 9 - n**2 > 0: state.impact_secondary[i] = drop_radius * math.sqrt((9 - n**2) / 8)
                state.show_primary = True; state.show_secondary = True
            elif btn["action"] == "back": return "BACK"
            return True
    if x >= ui_x_start:
        start_y = 60
        spacing = 50
        for i in range(len(RAINBOW_DATA)):
            y_pos = start_y + i * spacing
            if (ui_x_start + 10 <= x <= ui_x_start + 30) and (y_pos <= y <= y_pos + 20):
                state.visible_flags[i] = not state.visible_flags[i]
                state.focused_index = i
            if (ui_x_start + 60 <= x <= ui_x_start + 100) and (y_pos <= y <= y_pos + 20):
                state.focused_index = i
        return True
    return False

def main(screen=None):
    if screen is None:
        pygame.init()
        screen = pygame.display.set_mode((1200, 800), pygame.RESIZABLE)
    pygame.display.set_caption("Strålgång i en regndroppe")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("Arial", 16)
    
    state = SimulationState()
    canvas = pygame.Surface((INTERNAL_WIDTH, INTERNAL_HEIGHT))
    buttons = []

    running = True
    win_w, win_h = screen.get_width(), screen.get_height()

    while running:
        # Layout baserad på interna mått
        ui_x_start, drop_center, drop_radius = get_layout(INTERNAL_WIDTH, INTERNAL_HEIGHT)

        # Beräkna skala och offset för att behålla aspect ratio (Letterboxing)
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
                    # Konvertera musposition till interna koordinater
                    if offset_x <= mx < offset_x + new_w and offset_y <= my < offset_y + new_h:
                        internal_mx = (mx - offset_x) / scale
                        internal_my = (my - offset_y) / scale
                        
                        ui_res = handle_click((internal_mx, internal_my), state, ui_x_start, buttons, drop_radius)
                        if ui_res == "BACK":
                            running = False
                        elif not ui_res:
                            state.is_dragging = True
            elif event.type == pygame.MOUSEBUTTONUP:
                state.is_dragging = False
        
        if state.is_dragging:
            mx_raw, my_raw = pygame.mouse.get_pos()
            # Mappa även drag-rörelser
            internal_mx = (mx_raw - offset_x) / scale
            
            if internal_mx < ui_x_start:
                dx = internal_mx - drop_center[0]
                raw_dist = abs(dx)
                limit = drop_radius - 2
                if raw_dist > limit: raw_dist = limit
                if raw_dist < 5: raw_dist = 5
                if dx < 0: state.impact_primary[state.focused_index] = raw_dist
                else: state.impact_secondary[state.focused_index] = raw_dist

        # Rita allt på canvas (fast upplösning)
        canvas.fill(BACKGROUND_COLOR)
        pygame.draw.circle(canvas, DROP_FILL_COLOR, drop_center, drop_radius)
        pygame.draw.circle(canvas, DROP_OUTLINE_COLOR, drop_center, drop_radius, 2)
        pygame.draw.line(canvas, (50, 50, 50), (drop_center[0], 0), (drop_center[0], INTERNAL_HEIGHT), 1)
        pygame.draw.line(canvas, (50, 50, 50), (0, drop_center[1]), (ui_x_start, drop_center[1]), 1)
        
        focused_deviation_p = 0.0
        focused_deviation_s = 0.0
        
        ray_layer = pygame.Surface((INTERNAL_WIDTH, INTERNAL_HEIGHT))
        ray_layer.fill((0, 0, 0))
        
        for i, data in enumerate(RAINBOW_DATA):
            if state.visible_flags[i]:
                width = 4 if i == state.focused_index else 2
                intensity = 1.0 if i == state.focused_index else 0.7
                col = tuple(min(255, int(c * intensity)) for c in data["rgb"])
                temp_surf = pygame.Surface((INTERNAL_WIDTH, INTERNAL_HEIGHT))
                temp_surf.fill((0,0,0))
                
                if state.show_primary:
                    impact_p = state.impact_primary[i]
                    path_p, dev_p = calculate_ray_path_from_bottom(-impact_p, data["n"], drop_center, drop_radius, INTERNAL_HEIGHT, 1)
                    if path_p:
                        pygame.draw.lines(temp_surf, col, False, path_p, width)
                        if i == state.focused_index: focused_deviation_p = dev_p
                if state.show_secondary:
                    impact_s = state.impact_secondary[i]
                    path_s, dev_s = calculate_ray_path_from_bottom(impact_s, data["n"], drop_center, drop_radius, INTERNAL_HEIGHT, 2)
                    if path_s:
                        pygame.draw.lines(temp_surf, col, False, path_s, width)
                        if i == state.focused_index: focused_deviation_s = dev_s
                ray_layer.blit(temp_surf, (0,0), special_flags=pygame.BLEND_ADD)

        canvas.blit(ray_layer, (0,0), special_flags=pygame.BLEND_ADD)
        buttons = draw_top_controls(canvas, state, font)
        draw_ui_right_panel(canvas, state, font, ui_x_start, INTERNAL_HEIGHT)
        
        if focused_deviation_p or focused_deviation_s:
            big_font = pygame.font.SysFont("Arial", 20, bold=True)
            txt_lines = [f"Färg: {RAINBOW_DATA[state.focused_index]['name']}"]
            if state.show_primary: txt_lines.append(f"Primär vinkel: {focused_deviation_p:.1f}°")
            if state.show_secondary: txt_lines.append(f"Sekundär vinkel: {focused_deviation_s:.1f}°")
            for idx, txt in enumerate(txt_lines):
                surf = big_font.render(txt, True, WHITE)
                canvas.blit(surf, (drop_center[0] + drop_radius + 20, drop_center[1] - drop_radius - 60 + idx*25))

        # Rita canvas på skärmen, skalad och centrerad (letterbox)
        screen.fill(BACKGROUND_COLOR) # Rensa kanter
        scaled_surf = pygame.transform.scale(canvas, (new_w, new_h))
        screen.blit(scaled_surf, (offset_x, offset_y))
        
        pygame.display.flip()
        clock.tick(60)
    return

if __name__ == "__main__":
    main()