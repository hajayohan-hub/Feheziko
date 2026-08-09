import zlib
import struct
import os

def create_png(width, height, draw_func):
    # draw_func(x, y) returns (r, g, b, a)
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter byte: None
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), level=9))
    iend = chunk(b'IEND', b'')

    return header + ihdr + idat + iend

def draw_icon_any(x, y, w, h):
    # Feheziko Branding: Deep Indigo (#4f46e5 / #3730a3) with rounded rect & crisp letter F + book emblem
    cx, cy = w / 2, h / 2
    # Background gradient from #4f46e5 (top) to #312e81 (bottom)
    t = y / h
    r = int(79 * (1 - t) + 49 * t)
    g = int(70 * (1 - t) + 46 * t)
    b = int(229 * (1 - t) + 129 * t)
    
    # Outer rounded box
    corner_radius = w * 0.22
    dx = max(0, abs(x - cx) - (cx - corner_radius))
    dy = max(0, abs(y - cy) - (cy - corner_radius))
    dist = (dx * dx + dy * dy) ** 0.5
    
    if dist > corner_radius:
        return (0, 0, 0, 0) # Transparent outside
    
    # Inner emblem (Stylized Book / Letter F)
    # Book left page & right page in white / golden accent
    nx = (x - cx) / (w / 2)
    ny = (y - cy) / (h / 2)
    
    # Main white "F" emblem / Open Book icon in center (-0.45 to 0.45)
    in_emblem = False
    
    # Vertical bar of F
    if -0.30 <= nx <= -0.12 and -0.38 <= ny <= 0.38:
        in_emblem = True
    # Top horizontal bar of F
    elif -0.30 <= nx <= 0.30 and -0.38 <= ny <= -0.22:
        in_emblem = True
    # Middle horizontal bar of F
    elif -0.30 <= nx <= 0.22 and -0.08 <= ny <= 0.08:
        in_emblem = True
    # Accent dot / spark at top right (Amber #f59e0b)
    
    is_spark = ((nx - 0.28)**2 + (ny - 0.28)**2)**0.5 < 0.09
    
    if is_spark:
        return (245, 158, 11, 255) # Amber 500
    elif in_emblem:
        return (255, 255, 255, 255) # Pure White
    
    return (r, g, b, 255)

def draw_icon_maskable(x, y, w, h):
    # Maskable icon HAS NO TRANSPARENCY - full bleed background to edges!
    cx, cy = w / 2, h / 2
    t = y / h
    r = int(79 * (1 - t) + 49 * t)
    g = int(70 * (1 - t) + 46 * t)
    b = int(229 * (1 - t) + 129 * t)
    
    nx = (x - cx) / (w / 2)
    ny = (y - cy) / (h / 2)
    
    # Scaled down to safe zone (within central 70% radius)
    in_emblem = False
    if -0.22 <= nx <= -0.08 and -0.28 <= ny <= 0.28:
        in_emblem = True
    elif -0.22 <= nx <= 0.22 and -0.28 <= ny <= -0.16:
        in_emblem = True
    elif -0.22 <= nx <= 0.16 and -0.05 <= ny <= 0.06:
        in_emblem = True
        
    is_spark = ((nx - 0.22)**2 + (ny - 0.22)**2)**0.5 < 0.07
    
    if is_spark:
        return (245, 158, 11, 255)
    elif in_emblem:
        return (255, 255, 255, 255)
        
    return (r, g, b, 255)

os.makedirs("public/icons", exist_ok=True)

print("Generating 192x192 icon...")
with open("public/icons/icon-192.png", "wb") as f:
    f.write(create_png(192, 192, draw_icon_any))

print("Generating 512x512 icon...")
with open("public/icons/icon-512.png", "wb") as f:
    f.write(create_png(512, 512, draw_icon_any))

print("Generating maskable 192x192 icon...")
with open("public/icons/icon-maskable-192.png", "wb") as f:
    f.write(create_png(192, 192, draw_icon_maskable))

print("Generating maskable 512x512 icon...")
with open("public/icons/icon-maskable-512.png", "wb") as f:
    f.write(create_png(512, 512, draw_icon_maskable))

# Also copy to public/ as default icons
with open("public/icon-192.png", "wb") as f:
    f.write(create_png(192, 192, draw_icon_any))

with open("public/icon-512.png", "wb") as f:
    f.write(create_png(512, 512, draw_icon_any))

print("PWA Icons generated successfully!")
