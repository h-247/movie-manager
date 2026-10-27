from PIL import Image, ImageDraw

def create_movie_icon(path):
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    images = []

    for size in sizes:
        img = Image.new('RGBA', size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        w, h = size

        # Rounded rectangle background in #212121
        padding = int(w * 0.05)
        radius = int(w * 0.2)
        draw.rounded_rectangle(
            [padding, padding, w - padding, h - padding],
            radius=radius,
            fill=(33, 33, 33, 255),
            outline=(70, 70, 70, 255),
            width=max(1, int(w * 0.02))
        )

        # Clapperboard / Film slate
        cb_left = int(w * 0.2)
        cb_top = int(h * 0.22)
        cb_right = int(w * 0.8)
        cb_bottom = int(h * 0.72)
        cb_radius = int(w * 0.06)

        # Slate body
        draw.rounded_rectangle(
            [cb_left, cb_top, cb_right, cb_bottom],
            radius=cb_radius,
            fill=(20, 20, 20, 255),
            outline=(240, 240, 240, 255),
            width=max(1, int(w * 0.02))
        )

        # Play triangle in center (white)
        play_left = int(w * 0.45)
        play_top = int(h * 0.42)
        play_size = int(w * 0.16)
        draw.polygon(
            [
                (play_left, play_top),
                (play_left + play_size, play_top + play_size // 2),
                (play_left, play_top + play_size)
            ],
            fill=(245, 245, 245, 255)
        )

        # 3 status dots (Yellow, Blue, Green) at bottom
        dot_r = max(1, int(w * 0.04))
        y_pos = int(h * 0.82)
        # Yellow (To do)
        draw.ellipse([int(w * 0.35) - dot_r, y_pos - dot_r, int(w * 0.35) + dot_r, y_pos + dot_r], fill=(234, 179, 8, 255))
        # Blue (Doing)
        draw.ellipse([int(w * 0.50) - dot_r, y_pos - dot_r, int(w * 0.50) + dot_r, y_pos + dot_r], fill=(59, 130, 246, 255))
        # Green (Done)
        draw.ellipse([int(w * 0.65) - dot_r, y_pos - dot_r, int(w * 0.65) + dot_r, y_pos + dot_r], fill=(34, 197, 94, 255))

        images.append(img)

    images[0].save(path, format='ICO', sizes=[(s[0], s[1]) for s in sizes], append_images=images[1:])

if __name__ == '__main__':
    create_movie_icon('app.ico')
    print('Created app.ico successfully')
