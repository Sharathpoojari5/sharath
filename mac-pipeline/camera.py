"""Pinhole camera shared by the Python reaction logic and Blender, so both agree on where things are in the picture.

World: metres, Z up, the table is the plane z = 0.  The camera sits in front of the table (negative Y), looks at the table
centre, tilted down by `tilt` degrees, `dist` metres away.  `fov` is the field of view across the LONGER side of the image
(a phone main camera is about 69 degrees).
"""
import math
import numpy as np


class Camera:
    def __init__(self, width, height, dist=0.75, tilt=35.0, fov=69.0, target=(0.0, 0.0, 0.05)):
        self.W, self.H = width, height
        self.dist, self.tilt, self.fov = dist, tilt, fov
        t = math.radians(tilt)
        self.pos = np.array([0.0, -dist * math.cos(t), dist * math.sin(t)])
        self.target = np.array(target, dtype=float)
        f = self.target - self.pos
        self.fwd = f / np.linalg.norm(f)
        right = np.cross(self.fwd, [0.0, 0.0, 1.0])
        self.right = right / np.linalg.norm(right)
        self.up = np.cross(self.right, self.fwd)
        self.fpx = (max(width, height) / 2.0) / math.tan(math.radians(fov) / 2.0)

    def project(self, p):
        """World point -> pixel (x, y); y grows downward."""
        v = np.asarray(p, dtype=float) - self.pos
        zc = float(v @ self.fwd)
        if zc < 1e-4:
            return None
        return (self.W / 2 + self.fpx * float(v @ self.right) / zc, self.H / 2 - self.fpx * float(v @ self.up) / zc)

    def ray(self, px, py):
        d = self.fwd + self.right * ((px - self.W / 2) / self.fpx) - self.up * ((py - self.H / 2) / self.fpx)
        return self.pos, d / np.linalg.norm(d)

    def floor_point(self, px, py, z=0.0):
        """Pixel -> point on the table plane (z = `z`). None if the ray does not hit it."""
        o, d = self.ray(px, py)
        if abs(d[2]) < 1e-6:
            return None
        k = (z - o[2]) / d[2]
        return None if k <= 0 else o + d * k

    def blender_pose(self):
        """Location and a look-at direction for the Blender camera."""
        return tuple(self.pos), tuple(self.target)
