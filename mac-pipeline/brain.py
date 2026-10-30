"""The mammoth's behaviour: reacts to a tracked hand.  Same personality as the web app, in world units (metres)."""
import math
import random
import numpy as np

HEIGHT = 0.2          # mammoth height, metres
TIPS = [4, 8, 12, 16, 20]
PALM = [0, 5, 9, 13, 17]


def _clamp(v, a, b):
    return max(a, min(b, v))


class Brain:
    def __init__(self, x, y, face_xy, seed=3):
        self.x, self.y = x, y
        self.yaw = self._yaw_to(face_xy)
        self.mood, self.mood_t, self.mood_dur = 'idle', 0.0, 0.0
        self.target = None
        self.look = None
        self.look_until = 0.0
        self.lean = 0.0
        self.next_heart = 0.0
        self.hearts = []
        self.rng = random.Random(seed)
        self.events = []
        self.speed, self.turn = 0.18, math.radians(240)
        self.walk_phase = 0.0

    # forward vector for yaw is (-sin, cos); camera sits at -Y so yaw = pi faces the camera
    def _yaw_to(self, p):
        return math.atan2(-(p[0] - self.x), (p[1] - self.y)) if p is not None else 0.0

    def set(self, mood, dur, t=0.0):
        if mood != self.mood:
            self.events.append((round(t, 2), mood))
        self.mood, self.mood_t, self.mood_dur = mood, 0.0, dur

    def walk_to(self, x, y, t):
        self.target = (x, y)
        self.set('walking', 20.0, t)

    def pet(self, t):
        if t >= self.next_heart:
            for i in range(2):
                self.hearts.append({'x': self.x + self.rng.uniform(-.015, .015), 'y': self.y + self.rng.uniform(-.015, .015),
                                    'z': HEIGHT + .01 * i, 'age': -.15 * i,
                                    'vx': self.rng.uniform(-.03, .03), 'vy': self.rng.uniform(-.03, .03)})
            self.next_heart = t + 0.6
        self.set('happy', 1.2, t)

    def greet(self, cam_xy, t):
        self.look, self.look_until = cam_xy, t + 3
        self.set('greeting', 2.0, t)

    def look_at(self, p, t, seconds=0.4):
        if self.mood != 'walking' and p is not None:
            self.look, self.look_until = (p[0], p[1]), t + seconds

    def update(self, dt, t, cam_xy):
        self.mood_t += dt
        if self.mood not in ('idle', 'walking') and self.mood_t >= self.mood_dur:
            self.set('idle', 0.0, t)

        face = None
        if self.mood == 'walking' and self.target:
            dx, dy = self.target[0] - self.x, self.target[1] - self.y
            d = math.hypot(dx, dy)
            if d < 0.01:
                self.set('idle', 0.0, t)
                self.look, self.look_until = cam_xy, t + 2
            else:
                face = self.target
                step = min(d, self.speed * dt)
                self.x += dx / d * step
                self.y += dy / d * step
                self.walk_phase += dt * 11.0
        elif self.look and t < self.look_until:
            face = self.look
        if face is not None:
            want = self._yaw_to(face)
            diff = math.atan2(math.sin(want - self.yaw), math.cos(want - self.yaw))
            self.yaw += math.copysign(min(abs(diff), self.turn * dt), diff)

        sx = sy = sz = 1.0
        hop = rx = ry = rz = 0.0
        squint = 1.0
        nod = turn = 0.0
        m = self.mood
        if m == 'idle':
            sy = 1 + 0.03 * math.sin(t * 2.2)
        elif m == 'walking':
            hop = abs(math.sin(t * 11)) * 0.08
            rz = math.sin(t * 11) * 0.1
        elif m == 'happy':
            k = abs(math.sin(t * 12))
            sy = 1 - 0.12 * k
            sx = sz = 1 + 0.06 * k
            rz = math.sin(t * 14) * 0.12
            squint = 0.35
            nod = 0.25
        elif m == 'dancing':
            ry = self.mood_t * 5.2
            rz = math.sin(t * 8) * 0.2
            hop = abs(math.sin(t * 8)) * 0.15
        elif m == 'sitting':
            sy, sx = 0.72, 1.08
        elif m == 'jumping':
            u = min(1.0, self.mood_t / max(self.mood_dur, 1e-3))
            hop = 4 * u * (1 - u) * 0.6
            sy = 1 + 0.15 * math.sin(u * math.pi)
        elif m == 'greeting':
            rx = math.sin(t * 9) * 0.14
            rz = math.sin(t * 9) * 0.17
            hop = abs(math.sin(t * 6)) * 0.05
            nod = math.sin(t * 9) * 0.2
        elif m == 'dazzled':
            rx = -0.2
            ry = math.sin(t * 30) * 0.07
            squint = 0.2
        rz -= self.lean * 0.28

        for h in self.hearts:
            h['age'] += dt
        self.hearts = [h for h in self.hearts if h['age'] < 1.1]
        hearts = [[h['x'] + h['vx'] * h['age'], h['y'] + h['vy'] * h['age'], h['z'] + 0.12 * 1.0 * h['age'] * HEIGHT / 0.2,
                   1 - min(0.8, h['age'] / 1.1 * 0.8)] for h in self.hearts if h['age'] >= 0]
        return dict(x=self.x, y=self.y, yaw=self.yaw, hop=hop * HEIGHT, sx=sx, sy=sy, sz=sz,
                    pitch=-rx, roll=rz, spin=ry, squint=squint, nod=nod, turn=turn,
                    walk=math.sin(self.walk_phase) if m == 'walking' else 0.0, hearts=hearts)


def _dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


class HandReactor:
    """Turns a per-frame hand track into mammoth reactions (touch = pet, jab = jump, wave = greet, still palm = come)."""

    def __init__(self, cam, brain, fps):
        self.cam, self.brain, self.fps = cam, brain, fps
        self.prev = None
        self.prev_t = 0.0
        self.seen_since = None
        self.was_touching = False
        self.still_since = None
        self.wave_dir = 0
        self.flips = []

    def mammoth_box(self):
        b = self.brain
        pts = [self.cam.project((b.x + dx, b.y + dy, z)) for dx in (-.09, .09) for dy in (-.1, .1) for z in (0, HEIGHT * 1.05)]
        xs, ys = [p[0] for p in pts if p], [p[1] for p in pts if p]
        return min(xs), min(ys), max(xs), max(ys)

    def step(self, t, hand, ahead_hand, cam_xy):
        """hand / ahead_hand: 21 (x, y) pixel points, or None.  Returns nothing; drives self.brain."""
        b, cam = self.brain, self.cam
        if hand is None:
            self.prev = None
            self.was_touching = False
            self.still_since = None
            self.seen_since = None
            b.lean *= 0.85
            return
        if self.seen_since is None:
            self.seen_since = t
        x0, y0, x1, y1 = self.mammoth_box()
        w, h = x1 - x0, y1 - y0
        pad = min(w, h) * 0.06
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2

        def inside(p):
            return x0 + pad < p[0] < x1 - pad and y0 + pad < p[1] < y1 - pad

        contacts = sum(1 for i in TIPS + PALM if inside(hand[i]))
        touching = contacts >= 2
        center = ((hand[0][0] + hand[9][0]) / 2, (hand[0][1] + hand[9][1]) / 2)
        tip = hand[8]
        speed = tip_speed = vx = 0.0
        if self.prev is not None:
            dt = max(1e-3, t - self.prev_t)
            speed = _dist(center, self.prev[0]) / dt / cam.H
            tip_speed = _dist(tip, self.prev[1]) / dt / cam.H
            vx = (center[0] - self.prev[0][0]) / dt / cam.H
        self.prev, self.prev_t = (center, tip), t

        # it watches where your hand is going to be in a moment
        look_src = ahead_hand if ahead_hand is not None else hand
        lc = ((look_src[0][0] + look_src[9][0]) / 2, (look_src[0][1] + look_src[9][1]) / 2)
        b.look_at(cam.floor_point(*lc), t)
        floor_pt = cam.floor_point(*center)

        if touching and not self.was_touching and tip_speed > 1.6 and (t - self.seen_since) > 0.6 and inside(tip):
            b.set('jumping', 0.8, t)
        elif touching:
            b.lean = _clamp((center[0] - cx) / (w * 0.5), -1, 1)
            if speed > 0.1 or contacts >= 4:
                b.pet(t)
        else:
            b.lean *= 0.85
        self.was_touching = touching

        open_hand = all(_dist(hand[a], hand[0]) > _dist(hand[p], hand[0]) * 1.1 for a, p in zip((8, 12, 16, 20), (6, 10, 14, 18)))
        if open_hand and not touching:
            d = (vx > 0) - (vx < 0)
            if abs(vx) > 0.3 and d != self.wave_dir:
                self.wave_dir = d
                self.flips.append(t)
            self.flips = [f for f in self.flips if t - f < 1.5]
            if len(self.flips) >= 3:
                self.flips = []
                b.greet(cam_xy, t)
            if speed < 0.08:
                if self.still_since is None:
                    self.still_since = t
                if t - self.still_since > 1.2 and b.mood != 'walking' and floor_pt is not None:
                    self.still_since = t + 3
                    dx, dy = floor_pt[0] - b.x, floor_pt[1] - b.y
                    m = math.hypot(dx, dy)
                    if m > 0.5:
                        dx, dy = dx * 0.5 / m, dy * 0.5 / m
                    b.walk_to(b.x + dx, b.y + dy, t)
            else:
                self.still_since = None
        else:
            self.still_since = None
