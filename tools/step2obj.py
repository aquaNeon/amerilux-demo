# freecadcmd step2obj.py  (args via env STEP_IN, OBJ_OUT): STEP -> OBJ in inches, one group per solid
import os, FreeCAD, Part, MeshPart
src, out = os.environ["STEP_IN"], os.environ["OBJ_OUT"]
shape = Part.Shape()
shape.read(src)
solids = shape.Solids or [shape]
bb = shape.BoundBox
print("solids", len(solids), "bbox in:", [round(v / 25.4, 2) for v in (bb.XLength, bb.YLength, bb.ZLength)],
      "min", [round(v / 25.4, 2) for v in (bb.XMin, bb.YMin, bb.ZMin)])
lines, base = [], 1
for i, s in enumerate(solids):
    m = MeshPart.meshFromShape(Shape=s, LinearDeflection=float(os.environ.get("LIN", "0.25")), AngularDeflection=float(os.environ.get("ANG", "0.26")), Relative=False)  # mm, rad
    pts, tris = m.Topology
    lines.append(f"o part{i}")
    for p in pts:
        lines.append(f"v {p.x / 25.4:.5f} {p.y / 25.4:.5f} {p.z / 25.4:.5f}")
    for a, b, c in tris:
        lines.append(f"f {a + base} {b + base} {c + base}")
    base += len(pts)
    print(" part", i, "tris", len(tris), "vol in3", round(s.Volume / 25.4 ** 3, 2))
open(out, "w").write("\n".join(lines))
