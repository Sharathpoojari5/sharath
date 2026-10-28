// Automotive Ethernet seminar deck — academic style (white slides, one font, action titles).
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/2701422a-0a11-44d8-832b-9d1718ea6379_3c993c7e-d1c3-40f6-9533-26677a467fdf/pptx/scripts/apply_theme.js");

const OUT = __dirname + "/Automotive_Ethernet_Sharath_Poojari.pptx";
const THEME = {
  name: "Automotive Ethernet Seminar",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "2D2D2D", lt1: "FFFFFF", dk2: "1F4E79", lt2: "EBF3FA",
    accent1: "2E75B6", accent2: "C55A11", accent3: "1F4E79", accent4: "666666",
    accent5: "D0D7DE", accent6: "F8E5D6", hlink: "2E75B6", folHlink: "7030A0",
  },
};
const HEX = { navy: "1F4E79", blue: "2E75B6", orange: "C55A11", grey: "A6A6A6", body: "2D2D2D", muted: "666666", rule: "D0D7DE" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.author = "Sharath Poojari";
pres.title = "Automotive Ethernet";
pres.theme = { headFontFace: "Calibri", bodyFontFace: "Calibri" };
const C = pres.SchemeColor;
const NAVY = C.text2, BLUE = C.accent1, ORANGE = C.accent2, BODY = C.text1, MUTED = C.accent4, RULE = C.accent5, TINT = C.background2, WHITE = C.background1, OTINT = C.accent6;

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "crumb", type: "body", x: 0.6, y: 0.22, w: 9, h: 0.3, fontSize: 12, color: BLUE, bold: true, charSpacing: 1, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.55, w: 12.1, h: 0.95, fontSize: 28, bold: true, color: NAVY, valign: "top", margin: 0 }, text: "" } },
    { text: { text: "Automotive Ethernet  ·  Sharath Poojari", options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 12, color: MUTED, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 12, color: MUTED, align: "right" },
});
pres.defineSlideMaster({ title: "DARK", background: { color: NAVY }, objects: [] });

// ---------- Helpers ----------
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, fontFace: "Calibri", color: BODY, margin: 0 }, o));
const box = (s, o) => s.addShape(pres.shapes.RECTANGLE, Object.assign({ line: { color: RULE, width: 1 } }, o));
const hline = (s, x, y, w, color, width, o = {}) => s.addShape(pres.shapes.LINE, Object.assign({ x, y, w, h: 0, line: Object.assign({ color, width }, o) }));
const vline = (s, x, y, h, color, width, o = {}) => s.addShape(pres.shapes.LINE, Object.assign({ x, y, w: 0, h, line: Object.assign({ color, width }, o) }));
const cite = (s, text) => T(s, text, { x: 0.6, y: 6.6, w: 12.1, h: 0.3, fontSize: 12, color: MUTED });
function content(section, crumb, title) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(crumb.toUpperCase(), { placeholder: "crumb" });
  s.addText(title, { placeholder: "title" });
  return s;
}
const bullets = (items, size = 20) => items.map((it, i) => {
  const runs = Array.isArray(it) ? it : [it];
  return runs.map((r, j) => ({ text: typeof r === "string" ? r : r.t, options: Object.assign({ bold: typeof r !== "string" && r.b, breakLine: j === runs.length - 1 && i < items.length - 1 }, j === 0 ? { bullet: { indent: 18 } } : {}) }));
}).flat();

// ---------- Sections ----------
const S1 = "Introduction", S2 = "Fundamentals", S3 = "Working principle", S4 = "Components and architecture", S5 = "Applications", S6 = "Assessment", S7 = "Outlook and close";

// 1. Title
pres.addSection({ title: S1 });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: S1 });
  T(s, "SEMINAR  ·  AUTOMOTIVE SYSTEMS AND ELECTRONICS", { x: 0.8, y: 1.2, w: 11, h: 0.4, fontSize: 16, bold: true, color: "9DC3E6", charSpacing: 2 });
  T(s, "Automotive Ethernet", { x: 0.8, y: 1.8, w: 11.5, h: 1.1, fontSize: 54, bold: true, color: "FFFFFF" });
  T(s, "How a single twisted pair of wires is becoming the data backbone of the modern car", { x: 0.8, y: 2.95, w: 10.5, h: 1.0, fontSize: 26, color: "DCE8F5" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.55, w: 1.6, h: 0.05, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
  T(s, "Sharath Poojari", { x: 0.8, y: 4.75, w: 8, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF" });
  T(s, "[College name]  ·  [Department]  ·  [Date]", { x: 0.8, y: 5.25, w: 10, h: 0.45, fontSize: 18, color: "BFD3E8" });
  s.addNotes(`Timing for the whole talk: about 20 minutes plus questions. This slide: 30 seconds.

Good morning everyone. My name is Sharath Poojari, and my seminar topic is Automotive Ethernet.

Opening line: "A modern car has cameras, radar, large touch screens, and it even receives software updates over the air, like a phone. All of that data has to move between the computers inside the car. Today I will explain the network that makes this possible."

Then move straight to the next slide — do not read the title aloud word for word.`);
}

// 2. Motivation — chart
{
  const s = content(S1, "Introduction · Motivation", "In-vehicle data rates have outgrown the networks cars were originally built on");
  s.addChart(pres.charts.BAR, [{ name: "Max data rate (Mbit/s)", labels: ["LIN", "CAN", "CAN FD (typ.)", "FlexRay", "MOST150", "100BASE-T1", "1000BASE-T1", "10GBASE-T1"], values: [0.02, 1, 5, 10, 150, 100, 1000, 10000] }], {
    x: 0.6, y: 1.65, w: 7.3, h: 4.8, barDir: "bar", catAxisOrientation: "maxMin",
    valAxisLogScaleBase: 10, valAxisMinVal: 0.01, valAxisMaxVal: 100000,
    chartColors: [HEX.grey, HEX.grey, HEX.grey, HEX.grey, HEX.grey, HEX.blue, HEX.blue, HEX.blue],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "General", dataLabelFontSize: 14, dataLabelColor: HEX.body, dataLabelFontFace: "+mn-lt",
    catAxisLabelFontSize: 14, catAxisLabelColor: HEX.body, catAxisLabelFontFace: "+mn-lt",
    valAxisLabelFontSize: 12, valAxisLabelColor: HEX.muted, valAxisLabelFontFace: "+mn-lt", valAxisLabelFormatCode: "General",
    valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false,
    showValAxisTitle: true, valAxisTitle: "Maximum data rate, Mbit/s (log scale)", valAxisTitleFontSize: 14, valAxisTitleColor: HEX.muted, valAxisTitleFontFace: "+mn-lt",
  });
  // annotation
  s.addShape(pres.shapes.RECTANGLE, { x: 8.3, y: 1.75, w: 4.4, h: 1.25, fill: { color: OTINT }, line: { color: ORANGE, width: 1 } });
  T(s, [{ text: "≈ 1,500 Mbit/s", options: { bold: true, color: ORANGE, fontSize: 26, breakLine: true } }, { text: "one raw 1080p camera at 30 fps — 1,500× a CAN bus", options: { fontSize: 16 } }], { x: 8.5, y: 1.85, w: 4.0, h: 1.05, valign: "middle" });
  T(s, "What drives the demand", { x: 8.3, y: 3.25, w: 4.4, h: 0.4, fontSize: 20, bold: true, color: BLUE });
  T(s, bullets([[{ t: "ECUs: ", b: true }, "dozens to 100+ per car"], [{ t: "Sensors: ", b: true }, "cameras, radar, lidar"], [{ t: "Harness: ", b: true }, "heavy, costly wiring"], [{ t: "Software: ", b: true }, "GB-size OTA updates"]], 18), { x: 8.3, y: 3.7, w: 4.4, h: 2.4, fontSize: 18, paraSpaceAfter: 8, valign: "top" });
  cite(s, "Rates: ISO 17987 (LIN), ISO 11898 (CAN, CAN FD typical data phase), ISO 17458 (FlexRay), MOST150, IEEE 802.3bw/bp/ch. Camera: 1920×1080 px × 24 bit × 30 fps.");
  s.addNotes(`About 1.5 minutes. This slide answers: why did cars need a new network?

Point to the chart. "The grey bars are the networks cars have used for decades. LIN runs at 20 kilobits per second, classic CAN at 1 megabit per second, FlexRay at 10. The blue bars are Automotive Ethernet: 100 megabits, 1 gigabit and 10 gigabits. Note that the scale is logarithmic — every grid line is ten times the previous one."

Point to the orange box. "Here is the problem in one number. A single full-HD camera, uncompressed, at 30 frames per second, produces about 1.5 gigabits per second. That is fifteen hundred times what a CAN bus can carry." (If asked how: 1920 × 1080 pixels × 24 bits × 30 frames ≈ 1.5 Gbit/s.)

Then the four drivers on the right:
• More ECUs — electronic control units. Cars have dozens, premium cars over a hundred.
• More sensors for driver assistance — cameras, radar, lidar.
• The wiring harness — adding separate wires for every function makes it heavy and expensive, and weight costs fuel and battery range.
• Software — over-the-air updates can be several gigabytes.

Transition: "So the industry needed something fast, light and scalable. Let me state the question this seminar answers."`);
}

// 3. Question + roadmap
{
  const s = content(S1, "Introduction · Seminar question", "This seminar asks how Automotive Ethernet meets the car’s bandwidth, cost and real-time needs");
  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 1.75, w: 12.1, h: 1.35, fill: { color: TINT }, line: { color: BLUE, width: 1.5 } });
  T(s, "How can one unshielded twisted pair deliver gigabit, deterministic and secure communication in the harsh, cost-sensitive environment of a vehicle?", { x: 0.9, y: 1.85, w: 11.5, h: 1.15, fontSize: 22, color: NAVY, valign: "middle" });
  T(s, "Roadmap", { x: 0.6, y: 3.45, w: 6, h: 0.4, fontSize: 20, bold: true, color: BLUE });
  const steps = [["1", "Concept and evolution"], ["2", "Working principle and protocol stack"], ["3", "Components, block diagram, architecture"], ["4", "Applications in modern cars"], ["5", "Advantages, limitations, comparison"], ["6", "Recent developments and conclusions"]];
  steps.forEach(([n, t], i) => {
    const col = i < 3 ? 0 : 1, row = i % 3;
    const x = 0.6 + col * 6.2, y = 4.0 + row * 0.8;
    T(s, n, { x, y, w: 0.5, h: 0.6, fontSize: 24, bold: true, color: BLUE, valign: "middle" });
    T(s, t, { x: x + 0.55, y, w: 5.4, h: 0.6, fontSize: 20, valign: "middle" });
  });
  s.addNotes(`About 45 seconds. State the question clearly — it is the thread for the whole talk.

"The question I will answer is: how can one unshielded twisted pair of wires deliver gigabit speed, predictable timing and security, inside a car — which is hot, cold, vibrating, electrically noisy, and extremely cost-sensitive?"

Then briefly read the roadmap: "First the concept and how it evolved; then how it works; then the components, block diagram and vehicle architecture; then where it is used; then its advantages, limitations and how it compares with older networks; and finally the latest developments and my conclusions."`);
}

// 4. Concept — comparison table
pres.addSection({ title: S2 });
{
  const s = content(S2, "Fundamentals · Concept", "Automotive Ethernet keeps standard Ethernet and IP but replaces the physical layer with one unshielded pair");
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.navy } } });
  const rows = [
    [H("Attribute"), H("Office Ethernet (100BASE-TX)"), H("Automotive Ethernet (100BASE-T1)")],
    ["Wire pairs", "2 pairs (one per direction)", { text: "1 unshielded twisted pair", options: { bold: true, color: HEX.blue } }],
    ["Duplex method", "Separate pairs for TX and RX", { text: "Both directions on one pair (echo cancellation)", options: { bold: true, color: HEX.blue } }],
    ["Line coding", "4B5B + MLT-3", "4B3B + PAM3 (3 voltage levels)"],
    ["Reach", "100 m", "15 m — enough for a car"],
    ["Temperature", "Office conditions", "−40 °C to +125 °C (AEC-Q100 Grade 1)"],
    ["EMC requirement", "Office/IT limits", "Automotive limits (e.g. CISPR 25)"],
    ["Upper layers", "Ethernet MAC, IP, TCP/UDP", "Same — software is reused"],
  ];
  s.addTable(rows, { x: 0.6, y: 1.75, w: 12.1, colW: [2.6, 4.4, 5.1], fontFace: "Calibri", fontSize: 18, color: HEX.body, border: { type: "solid", pt: 0.75, color: HEX.rule }, rowH: 0.52, valign: "middle", margin: [0.06, 0.12, 0.06, 0.12] });
  cite(s, "IEEE Std 802.3bw-2015 (100BASE-T1); IEEE Std 802.3 clause 25 (100BASE-TX); AEC-Q100; CISPR 25.");
  s.addNotes(`About 1.5 minutes. This is the fundamental concept.

"Most of you know Ethernet — the cable in our computer lab. Automotive Ethernet is the same Ethernet, re-engineered to survive inside a car."

Definition to say clearly: "Automotive Ethernet is a family of IEEE 802.3 standards that carry Ethernet over a single twisted pair of wires, designed for the temperature, vibration and electromagnetic requirements of vehicles."

Walk through the table, comparing left and right:
• Office 100 Mbit/s Ethernet uses two pairs, one for each direction. Automotive uses only one pair — less copper, less weight, less cost.
• It still sends in both directions at the same time — full duplex — using echo cancellation. I will explain that on the working-principle slide.
• Line coding: three voltage levels, PAM3, instead of MLT-3.
• Reach is 15 metres instead of 100 — a car is only a few metres long.
• It must work from −40 to +125 °C, which is the automotive grade for chips, and meet strict automotive emission limits so it does not disturb the radio or other electronics.
• The last row is the key point: everything above the physical layer — the Ethernet frame, IP, TCP and UDP — stays the same. So car makers reuse decades of networking software and knowledge.

Key line: "New physical layer, standard Ethernet on top."`);
}

// 5. Evolution timeline
{
  const s = content(S2, "Fundamentals · Evolution", "Standardisation took Automotive Ethernet from 100 Mbit/s to 25 Gbit/s in under a decade");
  const ev = [["2008", "Ethernet used for diagnostics and ECU flashing"], ["2011", "BroadR-Reach (Broadcom); OPEN Alliance founded"], ["2013", "First in-vehicle camera network in series production"], ["2015", "IEEE 802.3bw: 100BASE-T1"], ["2016", "IEEE 802.3bp: 1000BASE-T1"], ["2019–20", "802.3cg 10BASE-T1S; 802.3ch 2.5/5/10 Gbit/s"], ["2023", "IEEE 802.3cy: 25GBASE-T1"]];
  const x0 = 0.6, step = 12.1 / 7, ly = 3.05;
  hline(s, x0, ly, 12.1, HEX.rule, 3);
  ev.forEach(([y, t], i) => {
    const cx = x0 + step * i + step / 2;
    const std = i >= 3;
    T(s, y, { x: cx - step / 2 + 0.05, y: 2.2, w: step - 0.1, h: 0.55, fontSize: 24, bold: true, color: std ? ORANGE : BLUE, align: "center" });
    s.addShape(pres.shapes.OVAL, { x: cx - 0.13, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: std ? ORANGE : BLUE }, line: { color: WHITE, width: 2 } });
    T(s, t, { x: cx - step / 2 + 0.08, y: 3.4, w: step - 0.16, h: 1.6, fontSize: 16, align: "center", valign: "top" });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 5.35, w: 12.1, h: 0.85, fill: { color: TINT }, line: { color: TINT, width: 0 } });
  T(s, [{ text: "Blue: ", options: { bold: true, color: BLUE } }, { text: "industry adoption.   " }, { text: "Orange: ", options: { bold: true, color: ORANGE } }, { text: "IEEE standards.   Speed rose 250× while staying on a single pair." }], { x: 0.85, y: 5.35, w: 11.6, h: 0.85, fontSize: 18, valign: "middle" });
  cite(s, "IEEE 802.3bw-2015, 802.3bp-2016, 802.3cg-2019, 802.3ch-2020, 802.3cy-2023; OPEN Alliance SIG; Matheus & Königseder (2021).");
  s.addNotes(`About 1.5 minutes. Walk left to right.

• 2008 — Ethernet first appeared in cars only as a fast workshop port, for diagnostics and for flashing (re-programming) ECU software, because CAN was too slow to load large files. BMW was an early adopter.
• 2011 — Broadcom introduced BroadR-Reach: 100 Mbit/s over a single unshielded twisted pair. In the same year, car makers and suppliers founded the OPEN Alliance to promote and test the technology.
• 2013 — first series-production use inside the vehicle network: the surround-view camera system of the BMW X5.
• 2015 — the IEEE standardised it as 802.3bw, 100BASE-T1. T1 means "one twisted pair".
• 2016 — gigabit: 1000BASE-T1.
• 2019–2020 — 10BASE-T1S, a 10 Mbit/s version where many nodes share one pair, and 802.3ch for 2.5, 5 and 10 Gbit/s.
• 2023 — 25 Gbit/s with 802.3cy.

Point to the bottom box: "Blue is industry adoption, orange is IEEE standards. In about ten years speed grew 250 times — and it is still one pair of wires."`);
}

// 6. Working principle — full duplex diagram
pres.addSection({ title: S3 });
{
  const s = content(S3, "Working principle · Full duplex", "Both PHYs transmit at once on one pair; echo cancellation separates the two directions");
  const phy = (x, name, role) => {
    box(s, { x, y: 1.8, w: 2.5, h: 3.9, fill: { color: TINT }, line: { color: BLUE, width: 1.5 } });
    T(s, [{ text: name, options: { bold: true, fontSize: 20, color: NAVY, breakLine: true } }, { text: role, options: { fontSize: 14, color: MUTED } }], { x: x + 0.15, y: 1.9, w: 2.2, h: 0.75, align: "center" });
    [["Transmitter (TX)", 2.8], ["Receiver (RX)", 3.75]].forEach(([t, y]) => { box(s, { x: x + 0.25, y, w: 2.0, h: 0.65, fill: { color: WHITE } }); T(s, t, { x: x + 0.25, y, w: 2.0, h: 0.65, fontSize: 16, align: "center", valign: "middle" }); });
    box(s, { x: x + 0.25, y: 4.7, w: 2.0, h: 0.75, fill: { color: OTINT }, line: { color: ORANGE, width: 1 } });
    T(s, "Hybrid + echo canceller", { x: x + 0.25, y: 4.7, w: 2.0, h: 0.75, fontSize: 15, bold: true, color: ORANGE, align: "center", valign: "middle" });
  };
  phy(0.6, "PHY A", "master — sets the clock");
  phy(4.95, "PHY B", "slave — recovers the clock");
  hline(s, 3.1, 3.55, 1.85, HEX.blue, 2.5, { endArrowType: "triangle" });
  hline(s, 3.1, 4.05, 1.85, HEX.orange, 2.5, { beginArrowType: "triangle" });
  T(s, "A → B", { x: 3.1, y: 3.1, w: 1.85, h: 0.35, fontSize: 14, color: BLUE, align: "center" });
  T(s, "B → A", { x: 3.1, y: 4.15, w: 1.85, h: 0.35, fontSize: 14, color: ORANGE, align: "center" });
  T(s, "one twisted pair, both at once", { x: 3.05, y: 4.6, w: 1.95, h: 0.7, fontSize: 14, color: MUTED, align: "center" });
  T(s, "How it works", { x: 8.0, y: 1.8, w: 4.7, h: 0.4, fontSize: 20, bold: true, color: BLUE });
  T(s, bullets([[{ t: "Encode: ", b: true }, "bits scrambled, mapped to symbols"], [{ t: "Modulate: ", b: true }, "3-level PAM3 voltages"], [{ t: "Transmit: ", b: true }, "both ends talk simultaneously"], [{ t: "Cancel echo: ", b: true }, "each RX subtracts its own TX signal"], [{ t: "Clock: ", b: true }, "slave locks to master timing"]], 18), { x: 8.0, y: 2.3, w: 4.7, h: 3.4, fontSize: 18, paraSpaceAfter: 10, valign: "top" });
  cite(s, "IEEE Std 802.3bw-2015, clause 96.");
  s.addNotes(`About 2 minutes — the most technical slide; slow down.

Question to pose: "How can one pair of wires carry data in both directions at the same time?"

Point to the diagram. Each end has a PHY — the physical-layer chip. Each PHY has a transmitter, a receiver, and a hybrid with an echo canceller.

Walk through the steps on the right:
1. Encode — data bits are scrambled, which spreads the signal energy and avoids long runs of identical bits, then mapped to symbols. In 100BASE-T1, every 4 bits become 3 ternary symbols (4B3B).
2. Modulate — symbols are sent as three voltage levels: plus one, zero, minus one. That is PAM3 — the next slide shows it.
3. Transmit — both PHYs send at the same time, on the same pair. Point to the blue and orange arrows.
4. Cancel the echo — the voltage on the wire is the sum of both signals. But each PHY knows exactly what it just sent, so it subtracts that from what it receives. What is left is the other side's signal. This is the same idea as noise-cancelling headphones.
5. Clock — one PHY is configured as master and sets the timing; the slave locks onto it, so both stay synchronised.

Key line: "Echo cancellation is what lets one pair replace two."`);
}

// 7. Signalling — PAM3 waveform
{
  const s = content(S3, "Working principle · Signalling", "PAM3 carries more information per symbol, which lowers signal frequency and emissions");
  const lv = { 1: 2.25, 0: 3.25, "-1": 4.25 };
  const seq = [1, 0, -1, -1, 1, 0, 1, -1, 0, 1];
  const x0 = 1.4, w = 0.6;
  [1, 0, -1].forEach((l) => { hline(s, x0, lv[l], w * seq.length, HEX.rule, 1, { dashType: "dash" }); T(s, l === 1 ? "+1" : l === 0 ? "0" : "−1", { x: 0.6, y: lv[l] - 0.2, w: 0.6, h: 0.4, fontSize: 18, bold: true, color: NAVY, align: "right" }); });
  seq.forEach((l, i) => {
    const x = x0 + i * w;
    hline(s, x, lv[l], w, HEX.blue, 3.5);
    if (i > 0 && seq[i - 1] !== l) { const a = lv[seq[i - 1]], b = lv[l]; vline(s, x, Math.min(a, b), Math.abs(a - b), HEX.blue, 3.5); }
    T(s, l === 1 ? "+" : l === 0 ? "0" : "−", { x, y: 4.55, w, h: 0.4, fontSize: 18, color: MUTED, align: "center" });
  });
  T(s, "symbol sequence on the wire (one symbol every 15 ns at 66.7 MBd)", { x: 1.4, y: 5.0, w: 6.0, h: 0.4, fontSize: 14, color: MUTED, align: "center" });
  T(s, "Signalling by speed grade", { x: 8.2, y: 1.8, w: 4.5, h: 0.4, fontSize: 20, bold: true, color: BLUE });
  T(s, bullets([[{ t: "100BASE-T1: ", b: true }, "4B3B, PAM3, 66.7 MBd"], [{ t: "1000BASE-T1: ", b: true }, "PAM3, 750 MBd + Reed–Solomon FEC"], [{ t: "2.5–25G: ", b: true }, "PAM4 (4 levels) + FEC"], [{ t: "10BASE-T1S: ", b: true }, "differential Manchester code"]], 18), { x: 8.2, y: 2.3, w: 4.5, h: 2.6, fontSize: 18, paraSpaceAfter: 10, valign: "top" });
  s.addShape(pres.shapes.RECTANGLE, { x: 8.2, y: 5.0, w: 4.5, h: 1.1, fill: { color: OTINT }, line: { color: ORANGE, width: 1 } });
  T(s, "Fewer symbols per second → lower frequency → less interference", { x: 8.4, y: 5.0, w: 4.1, h: 1.1, fontSize: 17, bold: true, color: ORANGE, valign: "middle" });
  cite(s, "IEEE Std 802.3bw-2015 (cl. 96), 802.3bp-2016 (cl. 97), 802.3ch-2020 (cl. 149), 802.3cg-2019 (cl. 147).");
  s.addNotes(`About 1.5 minutes.

Point to the waveform. "This is what the signal on the wire looks like. Instead of only two voltage levels, the PHY uses three: plus one, zero and minus one. This is PAM3 — pulse amplitude modulation with three levels."

Why it matters: "Each symbol carries more information than a simple on/off bit. So for the same data rate we need fewer symbols per second. 100BASE-T1 sends about 66.7 million symbols per second, one every 15 nanoseconds. A lower symbol rate means a lower signal frequency, and lower frequency means less electromagnetic radiation — which is exactly what an unshielded cable in a car needs."

Right side: faster versions use the same principle, scaled up:
• 1000BASE-T1 still uses PAM3, at 750 megabaud, and adds Reed–Solomon forward error correction, so bit errors caused by noise are corrected automatically.
• The multi-gigabit grades use PAM4, four levels.
• 10BASE-T1S uses a simpler differential Manchester code because it runs on a shared bus.

Key line (orange box): "Fewer symbols per second, lower frequency, less interference."`);
}

// 8. PHY family table
{
  const s = content(S3, "Working principle · PHY family", "A family of physical layers lets engineers match speed and cost to every link in the car");
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.navy } } });
  const rows = [
    [H("Standard"), H("Speed"), H("Topology / coding"), H("Reach"), H("Typical use")],
    ["10BASE-T1S (802.3cg)", "10 Mbit/s", "Shared bus, PLCA; DME", "25 m, ≥ 8 nodes", "Sensors, actuators; CAN replacement"],
    ["100BASE-T1 (802.3bw)", "100 Mbit/s", "Point-to-point; PAM3", "15 m", "Cameras, infotainment, diagnostics"],
    ["1000BASE-T1 (802.3bp)", "1 Gbit/s", "Point-to-point; PAM3 + FEC", "15 m (40 m)", "HD cameras, backbone links"],
    ["2.5/5/10GBASE-T1 (802.3ch)", "2.5–10 Gbit/s", "Point-to-point; PAM4", "15 m", "Zonal backbone, central computer"],
    ["25GBASE-T1 (802.3cy)", "25 Gbit/s", "Point-to-point; PAM4", "Short in-car links", "High-resolution sensors, compute"],
  ];
  s.addTable(rows, { x: 0.6, y: 1.75, w: 12.1, colW: [3.0, 1.7, 2.8, 1.8, 2.8], fontFace: "Calibri", fontSize: 17, color: HEX.body, border: { type: "solid", pt: 0.75, color: HEX.rule }, rowH: 0.62, valign: "middle", margin: [0.06, 0.1, 0.06, 0.1] });
  T(s, [{ text: "Reading the names: ", options: { bold: true, color: BLUE } }, { text: "number = speed · BASE = baseband · T1 = one twisted pair · S = short reach" }], { x: 0.6, y: 5.75, w: 12.1, h: 0.45, fontSize: 18 });
  cite(s, "IEEE Std 802.3cg-2019, 802.3bw-2015, 802.3bp-2016, 802.3ch-2020, 802.3cy-2023. PLCA: Physical Layer Collision Avoidance; DME: differential Manchester encoding.");
  s.addNotes(`About 1.5 minutes. "Automotive Ethernet is not one standard but a family, so designers never pay for more speed than a link needs."

Explain the names first, using the line at the bottom: the number is the speed, BASE means baseband, T1 means one twisted pair, and S means short reach.

Walk down the rows:
• 10BASE-T1S is special: it is a shared bus. At least eight nodes can sit on the same pair over 25 metres. A method called PLCA — Physical Layer Collision Avoidance — gives each node its turn in a round-robin, so frames never collide. That makes it a direct replacement for CAN for simple sensors and actuators.
• 100BASE-T1 — the original workhorse for cameras, infotainment and diagnostics.
• 1000BASE-T1 — gigabit, for HD cameras and backbone links; 15 metres normally, up to 40 metres in its longer-reach variant.
• 802.3ch — 2.5, 5 and 10 gigabits, for the backbone between zonal controllers and the central computer.
• 802.3cy — 25 gigabits for the next generation of high-resolution sensors and compute.

Key line: "The same Ethernet frames and software work across a 2,500-times range of speeds."`);
}

// 9. Protocol stack
{
  const s = content(S3, "Working principle · Protocol stack", "Only layer 1 is automotive-specific; every layer above reuses the IT networking ecosystem");
  const L = [
    ["Layers 5–7", "Application", "SOME/IP (services)  ·  DoIP, ISO 13400 (diagnostics)  ·  IEEE 1722 AVTP (audio/video)  ·  DDS / MQTT"],
    ["Layer 4", "Transport", "TCP (reliable, e.g. software updates)  ·  UDP (fast, e.g. sensor streams)"],
    ["Layer 3", "Network", "IPv4  ·  IPv6"],
    ["Layer 2", "Data link", "IEEE 802.3 MAC  ·  802.1Q VLANs  ·  TSN (802.1AS, 802.1Qbv …)  ·  MACsec 802.1AE"],
    ["Layer 1", "Physical", "10BASE-T1S  ·  100BASE-T1  ·  1000BASE-T1  ·  2.5–25GBASE-T1"],
  ];
  L.forEach(([n, name, items], i) => {
    const y = 1.8 + i * 0.86, last = i === 4;
    box(s, { x: 0.6, y, w: 2.7, h: 0.74, fill: { color: last ? ORANGE : NAVY }, line: { color: last ? ORANGE : NAVY, width: 0 } });
    T(s, [{ text: name, options: { bold: true, fontSize: 18, color: "FFFFFF", breakLine: true } }, { text: n, options: { fontSize: 13, color: "FFFFFF" } }], { x: 0.8, y, w: 2.4, h: 0.74, valign: "middle" });
    box(s, { x: 3.4, y, w: 9.3, h: 0.74, fill: { color: last ? OTINT : TINT }, line: { color: last ? ORANGE : TINT, width: last ? 1.5 : 0 } });
    T(s, items, { x: 3.6, y, w: 9.0, h: 0.74, fontSize: 17, valign: "middle", bold: last, color: last ? ORANGE : BODY });
  });
  T(s, [{ text: "Orange = new for automotive.  ", options: { bold: true, color: ORANGE } }, { text: "Blue rows are standard Ethernet/IP, reused unchanged." }], { x: 0.6, y: 6.15, w: 12.1, h: 0.4, fontSize: 16 });
  s.addNotes(`About 1.5 minutes. Relate it to the OSI model the audience already knows.

Point to the orange row: "Only the physical layer — the T1 family — is truly new. Everything above is reused from normal networking."

Go up the stack:
• Layer 2 — the standard Ethernet MAC and frame. VLANs separate traffic, for example infotainment from safety data. TSN adds timing guarantees — next section. MACsec can encrypt and authenticate every frame.
• Layer 3 — normal IPv4 and IPv6.
• Layer 4 — TCP when data must arrive reliably, like a software update; UDP when speed matters more, like sensor streams.
• Application — protocols built for cars:
  – SOME/IP: ECUs offer "services"; for example a camera ECU offers video and any ECU can subscribe to it. This is the basis of service-oriented architecture.
  – DoIP, Diagnostics over IP (ISO 13400): workshops read fault codes and re-flash ECUs quickly.
  – IEEE 1722: streams audio and video with fixed timing.
  – DDS and MQTT: data distribution in automated-driving software and to the cloud.

Key line: "Because the upper layers are standard, car software can use the same tools and skills as the internet."`);
}

// 10. Components
pres.addSection({ title: S4 });
{
  const s = content(S4, "Components and architecture · Major components", "Six building blocks turn an ECU’s data into a robust signal on the wire");
  const comps = [
    ["1", "Microcontroller / SoC", "Runs the application and TCP/IP stack; contains the Ethernet MAC"],
    ["2", "PHY transceiver", "Converts digital frames to PAM signals and back; echo cancellation"],
    ["3", "MDI network", "Common-mode choke, ESD protection, AC-coupling capacitors for EMC"],
    ["4", "Cable and connector", "Unshielded twisted pair (shielded for multi-gig); compact automotive connectors"],
    ["5", "Ethernet switch", "Forwards frames between ECUs; VLANs, TSN scheduling, filtering"],
    ["6", "Gateway / central computer", "Bridges Ethernet with CAN, LIN, FlexRay; routing and firewall"],
  ];
  comps.forEach(([n, h, d], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.1, y = 1.8 + row * 2.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 3.9, h: 2.15, fill: { color: TINT }, line: { color: TINT, width: 0 } });
    T(s, n, { x: x + 0.25, y: y + 0.2, w: 0.6, h: 0.5, fontSize: 26, bold: true, color: BLUE });
    T(s, h, { x: x + 0.25, y: y + 0.72, w: 3.4, h: 0.45, fontSize: 20, bold: true, color: NAVY });
    T(s, d, { x: x + 0.25, y: y + 1.17, w: 3.45, h: 0.9, fontSize: 16, valign: "top" });
  });
  cite(s, "Matheus & Königseder (2021), ch. 4–6; OPEN Alliance TC1/TC9 channel and component specifications.");
  s.addNotes(`About 1.5 minutes. These are the major components of an Automotive Ethernet system, in the order the data passes through them.

1. Microcontroller or SoC — the processor of the ECU. It runs the application and the TCP/IP software, and contains the Ethernet MAC, which builds the Ethernet frames.
2. PHY transceiver — a dedicated chip that turns digital frames into the PAM voltage signals on the wire, and back again. It also does the echo cancellation we saw.
3. MDI network — MDI means medium-dependent interface. Small passive parts between the PHY and the connector: a common-mode choke that suppresses interference, ESD protection against static discharge, and capacitors that block DC. These are what make the link pass automotive EMC tests.
4. Cable and connector — usually an unshielded twisted pair; for the multi-gigabit speeds a shielded cable is often used. Connectors are small and vibration-proof.
5. Ethernet switch — unlike a CAN bus, Ethernet is switched. The switch forwards each frame only to its destination, and supports VLANs and TSN time scheduling.
6. Gateway or central computer — connects the Ethernet world to the older CAN, LIN and FlexRay networks, which still exist in every car, and acts as a router and firewall.`);
}

// 11. Block diagram
{
  const s = content(S4, "Components and architecture · Block diagram", "In the signal path, the PHY converts frames to PAM symbols and the MDI network keeps EMC within limits");
  // SoC group
  box(s, { x: 0.6, y: 1.85, w: 3.0, h: 3.35, fill: { color: WHITE }, line: { color: NAVY, width: 1.5, dashType: "dash" } });
  T(s, "Microcontroller / SoC", { x: 0.6, y: 1.9, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: NAVY, align: "center" });
  [["Application (SOME/IP, DoIP)", 2.4], ["TCP / UDP · IP stack", 3.27], ["Ethernet MAC", 4.14]].forEach(([t, y]) => { box(s, { x: 0.8, y, w: 2.6, h: 0.72, fill: { color: TINT }, line: { color: TINT, width: 0 } }); T(s, t, { x: 0.85, y, w: 2.5, h: 0.72, fontSize: 15, align: "center", valign: "middle" }); });
  const blk = (x, w, title, sub, fill, lc) => { box(s, { x, y: 2.95, w, h: 1.25, fill: { color: fill }, line: { color: lc, width: 1.5 } }); T(s, [{ text: title, options: { bold: true, fontSize: 17, color: NAVY, breakLine: true } }, { text: sub, options: { fontSize: 14, color: MUTED } }], { x: x + 0.08, y: 2.95, w: w - 0.16, h: 1.25, align: "center", valign: "middle" }); };
  blk(4.25, 1.9, "PHY", "transceiver", TINT, BLUE);
  blk(6.8, 2.1, "MDI network", "choke · ESD · caps", TINT, BLUE);
  blk(10.5, 2.2, "Ethernet switch", "to other ECUs", TINT, BLUE);
  hline(s, 3.6, 3.57, 0.65, HEX.navy, 2, { endArrowType: "triangle" });
  T(s, "xMII", { x: 3.55, y: 3.15, w: 0.75, h: 0.35, fontSize: 13, color: MUTED, align: "center" });
  hline(s, 6.15, 3.57, 0.65, HEX.navy, 2, { endArrowType: "triangle" });
  hline(s, 8.9, 3.45, 1.6, HEX.blue, 3);
  hline(s, 8.9, 3.69, 1.6, HEX.orange, 3);
  T(s, "twisted pair ≤ 15 m", { x: 8.85, y: 3.85, w: 1.7, h: 0.6, fontSize: 13, color: MUTED, align: "center" });
  // captions
  const cap = (x, w, t) => T(s, t, { x, y: 4.4, w, h: 0.9, fontSize: 15, color: BODY, align: "center", valign: "top" });
  cap(4.1, 2.2, "digital ↔ analog; PAM3 coding; echo cancel");
  cap(6.7, 2.3, "filters noise, protects against ESD, blocks DC");
  cap(10.4, 2.4, "forwards frames; VLAN and TSN scheduling");
  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 5.55, w: 12.1, h: 0.8, fill: { color: TINT }, line: { color: TINT, width: 0 } });
  T(s, [{ text: "Data path: ", options: { bold: true, color: BLUE } }, { text: "software → frame (MAC) → symbols (PHY) → filtered signal (MDI) → cable → switch → destination ECU" }], { x: 0.85, y: 5.55, w: 11.6, h: 0.8, fontSize: 18, valign: "middle" });
  cite(s, "xMII: media-independent interface between MAC and PHY (e.g. RGMII, SGMII). Adapted from Matheus & Königseder (2021).");
  s.addNotes(`About 2 minutes. This is the block diagram of one Automotive Ethernet node and its link. Trace it left to right with your hand or a pointer.

• Inside the dashed box is the microcontroller or SoC. At the top, the application — for example a SOME/IP service or diagnostics. Below it the TCP/UDP and IP stack, and at the bottom the Ethernet MAC, which packs the data into Ethernet frames.
• The MAC connects to the PHY over a standard digital interface called xMII — for example RGMII or SGMII.
• The PHY turns the frames into PAM3 symbols, and does the echo cancellation so it can receive at the same time.
• The MDI network — choke, ESD protection, coupling capacitors — cleans the signal and protects the PHY. Without it, the link would fail EMC tests.
• Then the twisted pair, up to 15 metres, to an Ethernet switch, which forwards the frame to the destination ECU — a display, the central computer, or another sensor.

Read the summary line at the bottom: "software, frame, symbols, filtered signal, cable, switch, destination."

Receiving is the same path in reverse.`);
}

// 12. Architecture domain vs zonal
{
  const s = content(S4, "Components and architecture · Vehicle architecture", "Cars are moving from domain to zonal architectures built around an Ethernet backbone");
  // panels
  [[0.6, "Domain architecture (today)"], [6.85, "Zonal architecture (emerging)"]].forEach(([x, t]) => { s.addShape(pres.shapes.RECTANGLE, { x, y: 1.75, w: 5.85, h: 4.0, fill: { color: "F7F9FB" }, line: { color: RULE, width: 1 } }); T(s, t, { x: x + 0.25, y: 1.85, w: 5.4, h: 0.4, fontSize: 18, bold: true, color: NAVY }); });
  // domain
  box(s, { x: 2.6, y: 2.45, w: 1.75, h: 0.7, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
  T(s, "Central gateway", { x: 2.6, y: 2.45, w: 1.75, h: 0.7, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  vline(s, 3.475, 3.15, 0.45, HEX.muted, 1.5);
  hline(s, 1.4, 3.6, 4.15, HEX.muted, 1.5);
  const doms = [["Powertrain", "CAN"], ["Chassis", "FlexRay"], ["Body", "CAN / LIN"], ["Infotainment", "MOST"]];
  doms.forEach(([d, b], i) => {
    const cx = 1.4 + i * 1.383;
    vline(s, cx, 3.6, 0.35, HEX.muted, 1.5);
    box(s, { x: cx - 0.66, y: 3.95, w: 1.32, h: 0.7, fill: { color: WHITE }, line: { color: NAVY, width: 1 } });
    T(s, d, { x: cx - 0.66, y: 3.95, w: 1.32, h: 0.7, fontSize: 13, bold: true, align: "center", valign: "middle" });
    T(s, b, { x: cx - 0.66, y: 4.7, w: 1.32, h: 0.35, fontSize: 13, color: MUTED, align: "center" });
  });
  T(s, "Grouped by function; many ECUs, mixed buses, gateway bottleneck", { x: 0.85, y: 5.1, w: 5.4, h: 0.55, fontSize: 14, color: BODY });
  // zonal
  box(s, { x: 8.85, y: 3.25, w: 1.85, h: 0.85, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
  T(s, "Central computer", { x: 8.85, y: 3.25, w: 1.85, h: 0.85, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  const zones = [[7.1, 2.4, "Zone front-left"], [7.1, 4.15, "Zone rear-left"], [11.0, 2.4, "Zone front-right"], [11.0, 4.15, "Zone rear-right"]];
  zones.forEach(([x, y, t]) => { box(s, { x, y, w: 1.25, h: 0.7, fill: { color: WHITE }, line: { color: BLUE, width: 1.5 } }); T(s, t, { x, y, w: 1.25, h: 0.7, fontSize: 13, bold: true, align: "center", valign: "middle" }); });
  hline(s, 7.725, 3.675, 1.125, HEX.blue, 3.5); vline(s, 7.725, 3.1, 1.05, HEX.blue, 3.5);
  hline(s, 10.7, 3.675, 0.925, HEX.blue, 3.5); vline(s, 11.625, 3.1, 1.05, HEX.blue, 3.5);
  T(s, "multi-gig Ethernet", { x: 8.75, y: 2.75, w: 2.05, h: 0.4, fontSize: 13, color: BLUE, bold: true, align: "center" });
  T(s, "Grouped by location; zones bridge local CAN, LIN, 10BASE-T1S", { x: 7.1, y: 5.1, w: 5.4, h: 0.55, fontSize: 14, color: BODY });
  T(s, [{ text: "Effect: ", options: { bold: true, color: ORANGE } }, { text: "fewer ECUs, shorter harness, software centralised and updatable over the air" }], { x: 0.6, y: 5.95, w: 12.1, h: 0.45, fontSize: 18 });
  cite(s, "Schematic, adapted from industry descriptions of zonal E/E architectures (e.g. Matheus & Königseder, 2021).");
  s.addNotes(`About 2 minutes. This is where Automotive Ethernet changes the whole car, not just one link.

Left — domain architecture, used in most cars today. ECUs are grouped by function: powertrain, chassis, body, infotainment. Each domain has its own bus — CAN, FlexRay, LIN, MOST — and a central gateway translates between them. Problems: many ECUs, long wires running all over the car because each function connects wherever its sensors are, and the gateway becomes a bottleneck.

Right — zonal architecture, which new vehicle platforms are adopting. ECUs are grouped by location instead: front-left, front-right, rear-left, rear-right. Each zone controller collects all the nearby sensors and actuators over short local links — CAN, LIN or 10BASE-T1S — and connects to a powerful central computer over a multi-gigabit Ethernet backbone, shown in blue.

Effect (bottom line): fewer ECUs, a shorter and lighter harness, and most software running in the central computer, where it can be updated over the air. This is what people mean by the "software-defined vehicle" — and it is only possible with Ethernet's bandwidth.`);
}

// 13. TSN
{
  const s = content(S4, "Components and architecture · Real-time behaviour", "Time-Sensitive Networking adds the determinism that safety-related traffic requires");
  T(s, [{ text: "Problem: ", options: { bold: true, color: ORANGE } }, { text: "standard Ethernet is best effort — a brake or steering frame can wait behind a large video frame." }], { x: 0.6, y: 1.75, w: 12.1, h: 0.5, fontSize: 19 });
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.navy } } });
  const rows = [
    [H("IEEE standard"), H("Mechanism"), H("What it guarantees")],
    ["802.1AS (gPTP)", "Precise time synchronisation", "All nodes share one clock (sub-µs accuracy)"],
    ["802.1Qav", "Credit-based shaper", "Smooth bandwidth for audio/video streams"],
    ["802.1Qbv", "Time-aware shaper", "Reserved time slots for critical traffic"],
    ["802.1Qbu / 802.3br", "Frame preemption", "Urgent frames interrupt long frames"],
    ["802.1CB", "Frame replication and elimination", "Redundant paths survive a link failure"],
    ["802.1Qci", "Per-stream filtering and policing", "A faulty node cannot flood the network"],
  ];
  s.addTable(rows, { x: 0.6, y: 2.45, w: 12.1, colW: [2.8, 4.2, 5.1], fontFace: "Calibri", fontSize: 17, color: HEX.body, border: { type: "solid", pt: 0.75, color: HEX.rule }, rowH: 0.52, valign: "middle", margin: [0.06, 0.12, 0.06, 0.12] });
  cite(s, "IEEE 802.1 Time-Sensitive Networking Task Group: IEEE Std 802.1AS, 802.1Q (Qav, Qbv, Qbu, Qci), 802.1CB; IEEE Std 802.3br.");
  s.addNotes(`About 1.5 minutes. This addresses the biggest technical objection to Ethernet in cars: timing.

Problem: "Normal Ethernet is 'best effort'. If a large video frame is being sent, a small but urgent braking message may have to wait. For entertainment that is fine; for safety functions it is not. Engineers need a guaranteed maximum delay — that is called determinism."

The solution is TSN, Time-Sensitive Networking — a set of IEEE 802.1 extensions. Go through the table:
• 802.1AS, gPTP — every node synchronises to one common clock, accurate to under a microsecond. Everything else builds on this.
• 802.1Qav — the credit-based shaper keeps audio and video streams smooth.
• 802.1Qbv — the time-aware shaper: like a train timetable, it reserves exact time slots for critical traffic.
• Frame preemption — an urgent frame can interrupt a long, low-priority frame and the long one resumes afterwards.
• 802.1CB — sends critical frames over two paths, so the system survives a broken link.
• 802.1Qci — filtering and policing, so one faulty or attacked ECU cannot flood the network.

Key line: "With TSN, Ethernet can carry control data with guaranteed timing, not just bulk data."`);
}

// 14. Applications
pres.addSection({ title: S5 });
{
  const s = content(S5, "Applications", "Ethernet now carries the car’s highest-bandwidth and most software-intensive functions");
  const apps = [
    ["ADAS and automated driving", "Cameras, radar and lidar stream to the central computer for sensor fusion", "1000BASE-T1, multi-gig"],
    ["Infotainment and displays", "Multiple HD screens, audio and video streaming (AVB/TSN)", "100/1000BASE-T1"],
    ["Diagnostics and OTA updates", "DoIP (ISO 13400) for fast flashing; gigabyte software updates", "100BASE-T1, 1000BASE-T1"],
    ["Vehicle backbone", "Links zonal controllers, gateway and central compute", "2.5–10GBASE-T1"],
    ["Connectivity and telematics", "Telematics unit, V2X and cloud services over IP", "100/1000BASE-T1"],
    ["Body and edge devices", "Lights, switches, small sensors on one shared bus", "10BASE-T1S"],
  ];
  apps.forEach(([h, d, l], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.1, y = 1.8 + row * 2.4;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 3.9, h: 2.2, fill: { color: TINT }, line: { color: TINT, width: 0 } });
    T(s, h, { x: x + 0.25, y: y + 0.2, w: 3.45, h: 0.5, fontSize: 20, bold: true, color: NAVY });
    T(s, d, { x: x + 0.25, y: y + 0.75, w: 3.45, h: 0.95, fontSize: 16, valign: "top" });
    T(s, l, { x: x + 0.25, y: y + 1.7, w: 3.45, h: 0.35, fontSize: 15, bold: true, color: BLUE });
  });
  cite(s, "Link types are typical choices, not fixed rules; they vary by manufacturer and vehicle platform.");
  s.addNotes(`About 1.5 minutes. Now, where is Automotive Ethernet used in modern cars? The blue line at the bottom of each box shows the typical link type.

• ADAS and automated driving — the biggest driver. Cameras, radar and lidar send raw or lightly processed data to a central computer that fuses it to understand the scene. Needs gigabit or multi-gigabit links.
• Infotainment and displays — modern cars have several HD screens and premium audio systems. Ethernet with AVB or TSN streams audio and video in sync.
• Diagnostics and over-the-air updates — DoIP lets a workshop re-flash all ECUs much faster than over CAN, and lets the car download and install large updates.
• Vehicle backbone — the multi-gigabit links between zonal controllers and the central computer that we saw in the architecture slide.
• Connectivity — the telematics unit connects the car to the cloud and to other vehicles and infrastructure (V2X), all over IP.
• Body and edge — with 10BASE-T1S, even simple devices like lights and switches can be on Ethernet, sharing a single pair.

Mention: the exact link type varies by manufacturer.`);
}

// 15. Advantages vs limitations
pres.addSection({ title: S6 });
{
  const s = content(S6, "Assessment · Advantages and limitations", "Ethernet wins on bandwidth and ecosystem, but adds cost, complexity and attack surface");
  const col = (x, head, color, fill, items) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.8, w: 5.9, h: 4.55, fill: { color: fill }, line: { color: fill, width: 0 } });
    T(s, head, { x: x + 0.3, y: 1.95, w: 5.3, h: 0.5, fontSize: 22, bold: true, color });
    T(s, bullets(items, 18), { x: x + 0.3, y: 2.55, w: 5.35, h: 3.7, fontSize: 18, paraSpaceAfter: 10, valign: "top" });
  };
  col(0.6, "Advantages", BLUE, TINT, [[{ t: "Scalable speed: ", b: true }, "10 Mbit/s to 25 Gbit/s"], [{ t: "Light wiring: ", b: true }, "one unshielded pair, small connectors"], [{ t: "Mature ecosystem: ", b: true }, "IP, tools, skilled engineers"], [{ t: "Service-oriented: ", b: true }, "SOME/IP; enables OTA updates"], [{ t: "Security options: ", b: true }, "VLANs, firewalls, MACsec, TLS"]]);
  col(6.8, "Limitations", ORANGE, OTINT, [[{ t: "Not deterministic by default: ", b: true }, "needs TSN"], [{ t: "Cost per node: ", b: true }, "PHY and switch ports cost more than CAN"], [{ t: "EMC: ", b: true }, "hard at multi-gig on unshielded cable"], [{ t: "Attack surface: ", b: true }, "IP networks invite cyber attacks"], [{ t: "Power and complexity: ", b: true }, "sleep/wake (TC10), configuration, testing"]]);
  cite(s, "OPEN Alliance TC10 (sleep/wake-up); IEEE 802.1AE (MACsec); ISO/SAE 21434 (vehicle cybersecurity engineering).");
  s.addNotes(`About 2 minutes. A balanced assessment.

Advantages (left, blue):
• Scalable speed — one technology family from 10 megabits to 25 gigabits.
• Lighter, cheaper wiring — a single unshielded pair and small connectors save weight and cost compared with many separate buses.
• Mature ecosystem — the internet's protocols, test tools and millions of engineers who already know them.
• Service-oriented architecture — with SOME/IP, software functions can find and use each other anywhere in the car, which is the basis for over-the-air updates and new features after purchase.
• Security options — VLANs, firewalls, MACsec encryption and TLS are all available.

Limitations (right, orange) — address them honestly; this pre-empts audience questions:
• Not deterministic out of the box — needs TSN, which adds complexity.
• Cost per node — a PHY plus a switch port costs more than a CAN transceiver, so for simple sensors CAN and LIN remain cheaper. That is why they are not disappearing.
• EMC — at multi-gigabit speeds an unshielded cable radiates and picks up noise; shielded cable is often needed.
• Attack surface — an IP network that connects to the internet can be attacked; standards like ISO/SAE 21434 now require cybersecurity engineering.
• Power and complexity — PHYs draw more power than CAN, so they need sleep and wake-up mechanisms (OPEN Alliance TC10), and switches need careful configuration and testing.`);
}

// 16. Comparison table
{
  const s = content(S6, "Assessment · Comparison", "Ethernet complements CAN and LIN rather than replacing them");
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.navy } } });
  const E = (t) => ({ text: t, options: { bold: true, color: HEX.navy, fill: { color: "EBF3FA" } } });
  const rows = [
    [H("Network"), H("Max data rate"), H("Medium / topology"), H("Typical use")],
    ["LIN", "20 kbit/s", "Single wire, bus", "Windows, seats, mirrors"],
    ["CAN", "1 Mbit/s", "Twisted pair, bus", "Engine, chassis, body control"],
    ["CAN FD", "≈ 5 Mbit/s (data phase, typical)", "Twisted pair, bus", "Powertrain, gateway traffic"],
    ["FlexRay", "10 Mbit/s", "Twisted pair, time-triggered", "Chassis, x-by-wire"],
    ["MOST150", "150 Mbit/s", "Optical / coax ring", "Older infotainment systems"],
    [E("Automotive Ethernet"), E("10 Mbit/s – 25 Gbit/s"), E("One twisted pair, switched"), E("ADAS, backbone, infotainment, OTA")],
  ];
  s.addTable(rows, { x: 0.6, y: 1.75, w: 12.1, colW: [2.7, 3.2, 3.0, 3.2], fontFace: "Calibri", fontSize: 18, color: HEX.body, border: { type: "solid", pt: 0.75, color: HEX.rule }, rowH: 0.55, valign: "middle", margin: [0.06, 0.12, 0.06, 0.12] });
  T(s, [{ text: "Takeaway: ", options: { bold: true, color: BLUE } }, { text: "each network keeps the job it is cheapest for; Ethernet takes the high-bandwidth backbone." }], { x: 0.6, y: 5.85, w: 12.1, h: 0.45, fontSize: 18 });
  cite(s, "ISO 17987 (LIN), ISO 11898 (CAN, CAN FD), ISO 17458 (FlexRay), MOST Cooperation (MOST150), IEEE 802.3.");
  s.addNotes(`About 1 minute. A side-by-side comparison with the networks the audience may already know.

Go quickly row by row:
• LIN — 20 kilobits, a single wire, very cheap; used for windows, seats and mirrors.
• CAN — 1 megabit; the classic network for engine, chassis and body control.
• CAN FD — the faster version of CAN, typically around 5 megabits in the data phase.
• FlexRay — 10 megabits and time-triggered, used for chassis and x-by-wire systems.
• MOST — up to 150 megabits, used in older infotainment systems, now largely replaced by Ethernet.
• Automotive Ethernet — 10 megabits to 25 gigabits, switched, used for ADAS, the backbone, infotainment and updates.

Key message (bottom line): "Ethernet does not kill CAN and LIN. Each network keeps the job it is cheapest for, and Ethernet takes over where bandwidth matters."`);
}

// 17. Recent developments
pres.addSection({ title: S7 });
{
  const s = content(S7, "Outlook · Recent developments", "Current work pushes Ethernet to the edge, to higher speeds, and deeper into safety and security");
  const items = [
    ["Zonal, software-defined vehicles", "Ethernet backbone plus central computers; features added by OTA updates"],
    ["10BASE-T1S at the edge", "Multidrop Ethernet for sensors and actuators; one protocol end to end"],
    ["Multi-gig and 25 Gbit/s", "802.3ch and 802.3cy for high-resolution cameras and central compute"],
    ["Optical automotive Ethernet", "IEEE 802.3dh: multi-gigabit over optical fibre, immune to EMI"],
    ["In-vehicle security", "MACsec (802.1AE) encrypts and authenticates frames on every link"],
    ["Power and data on one pair", "PoDL (802.3bu) powers cameras over the data cable; TC10 sleep/wake"],
  ];
  items.forEach(([h, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.15, y = 1.8 + row * 1.55;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 5.95, h: 1.4, fill: { color: TINT }, line: { color: TINT, width: 0 } });
    T(s, String(i + 1), { x: x + 0.25, y, w: 0.5, h: 1.4, fontSize: 26, bold: true, color: BLUE, valign: "middle" });
    T(s, [{ text: h, options: { bold: true, fontSize: 19, color: NAVY, breakLine: true } }, { text: d, options: { fontSize: 16 } }], { x: x + 0.8, y: y + 0.1, w: 4.95, h: 1.2, valign: "middle" });
  });
  cite(s, "IEEE Std 802.3cg-2019, 802.3ch-2020, 802.3cy-2023, 802.3dh, 802.3bu-2016; IEEE 802.1AE; OPEN Alliance TC10.");
  s.addNotes(`About 2 minutes. The latest developments.

1. Zonal and software-defined vehicles — as we saw, car makers are moving to central computers connected by an Ethernet backbone, so new features can be delivered by software updates during the car's life.
2. 10BASE-T1S at the edge — lets even small sensors and actuators use Ethernet on a shared pair. Then the whole car can use one protocol family end to end, without translating between CAN and Ethernet in gateways.
3. Multi-gigabit and 25 gigabit — for high-resolution cameras (8 megapixels and more) and for links between central computers.
4. Optical automotive Ethernet — IEEE 802.3dh defines multi-gigabit Ethernet over optical fibre for cars. Light is immune to electromagnetic interference, and fibre is very light.
5. Security — MACsec encrypts and authenticates every Ethernet frame on a link, so an attacker who taps a cable cannot read or inject messages.
6. Power over data lines — PoDL sends power and data over the same pair, for example to power a camera without a separate power wire. Also OPEN Alliance TC10 lets parts of the network sleep and wake up to save energy — very important in electric vehicles.

Key line: "Ethernet is spreading in both directions — down to the smallest sensor and up to 25 gigabits."`);
}

// 18. Conclusions (dark)
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: S7 });
  T(s, "CONCLUSIONS", { x: 0.8, y: 0.6, w: 8, h: 0.4, fontSize: 16, bold: true, color: "9DC3E6", charSpacing: 2 });
  T(s, "Automotive Ethernet answers the car’s data problem with one standard family and one pair of wires", { x: 0.8, y: 1.05, w: 11.7, h: 1.1, fontSize: 30, bold: true, color: "FFFFFF" });
  const pts = [
    ["Bandwidth: ", "PAM signalling and echo cancellation deliver 10 Mbit/s – 25 Gbit/s over one pair"],
    ["Real time: ", "TSN adds guaranteed timing; MACsec and firewalls add security"],
    ["Architecture: ", "an Ethernet backbone enables zonal, software-defined vehicles"],
    ["Balance: ", "CAN and LIN remain for low-cost nodes; 10BASE-T1S is starting to reach them"],
  ];
  T(s, pts.map(([b, t], i) => [{ text: b, options: { bold: true, color: "9DC3E6", bullet: { indent: 18 } } }, { text: t, options: { color: "FFFFFF", breakLine: i < pts.length - 1 } }]).flat(), { x: 0.8, y: 2.55, w: 11.7, h: 3.0, fontSize: 21, paraSpaceAfter: 14, valign: "top" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 5.9, w: 1.6, h: 0.05, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
  T(s, "Questions and feedback welcome  ·  Sharath Poojari  ·  [email address]", { x: 0.8, y: 6.05, w: 11.7, h: 0.45, fontSize: 18, color: "DCE8F5" });
  s.addNotes(`About 1 minute. Leave this slide on screen during the whole Q&A.

Return to the question from slide 3: "I started by asking how one twisted pair can deliver gigabit, real-time and secure communication in a car. Here is the answer in four points."

• Bandwidth — multi-level PAM signalling and echo cancellation let one pair carry from 10 megabits to 25 gigabits.
• Real time and security — TSN gives guaranteed timing; MACsec and firewalls protect the network.
• Architecture — the Ethernet backbone is what makes zonal, software-defined vehicles possible.
• Balance — CAN and LIN are not disappearing; they remain the cheapest choice for simple nodes, but 10BASE-T1S is starting to bring Ethernet to them too.

Close: "Thank you for your attention. I'd be happy to take questions or feedback."
(The appendix has prepared answers to likely questions — only open it if a matching question comes up.)`);
}

// 19. References
{
  const s = content(S7, "References", "References");
  const refs = [
    "Matheus, K., & Königseder, T. (2021). Automotive Ethernet (3rd ed.). Cambridge University Press.",
    "IEEE Std 802.3bw-2015 — 100BASE-T1: 100 Mb/s operation over a single balanced twisted pair.",
    "IEEE Std 802.3bp-2016 — 1000BASE-T1: 1 Gb/s operation over a single twisted-pair copper cable.",
    "IEEE Std 802.3cg-2019 — 10 Mb/s single-pair Ethernet (10BASE-T1S / 10BASE-T1L).",
    "IEEE Std 802.3ch-2020 — 2.5/5/10GBASE-T1 multi-gigabit automotive Ethernet.",
    "IEEE Std 802.3cy-2023 — 25GBASE-T1. IEEE Std 802.3bu-2016 — Power over Data Lines (PoDL).",
    "IEEE Std 802.1AS (gPTP), 802.1Q (Qav, Qbv, Qbu, Qci), 802.1CB, 802.1AE (MACsec).",
    "ISO 13400 (Diagnostics over IP); ISO 11898 (CAN); ISO 17987 (LIN); ISO 17458 (FlexRay); ISO/SAE 21434.",
    "OPEN Alliance SIG — technical specifications incl. TC10 sleep/wake-up. https://opensig.org",
  ];
  T(s, refs.map((r, i) => ({ text: r, options: { bullet: { type: "number" }, breakLine: i < refs.length - 1 } })), { x: 0.6, y: 1.65, w: 12.1, h: 5.0, fontSize: 16, paraSpaceAfter: 8, valign: "top" });
  s.addNotes(`Do not present this slide in detail. Show it for a moment after the conclusions if your evaluator expects references, or keep it for the printed/PDF version.

If asked "where did you get this from": the main textbook is Matheus and Königseder, "Automotive Ethernet", Cambridge University Press; the technical numbers come from the IEEE 802.3 and 802.1 standards listed here.`);
}

// 20. Appendix — anticipated questions
{
  const s = content(S7, "Appendix A · Anticipated questions", "Appendix A: prepared answers to likely questions");
  const qa = [
    ["Will Ethernet replace CAN completely?", "Not soon. CAN and LIN stay for cheap, low-speed nodes; 10BASE-T1S competes at the edge."],
    ["Why only 15 m reach?", "A car needs only a few metres; shorter reach allows simpler, cheaper, lower-power PHYs."],
    ["How is it protected from hackers?", "Network segmentation (VLANs), firewalls in gateways, MACsec, TLS, intrusion detection; ISO/SAE 21434 process."],
    ["Why not just use wireless inside the car?", "Wires are more reliable, have lower latency and are far harder to jam or eavesdrop on."],
  ];
  qa.forEach(([q, a], i) => {
    const y = 1.75 + i * 1.18;
    T(s, q, { x: 0.6, y, w: 12.1, h: 0.42, fontSize: 19, bold: true, color: NAVY });
    T(s, a, { x: 0.6, y: y + 0.44, w: 12.1, h: 0.6, fontSize: 17, valign: "top" });
  });
  s.addNotes(`Backup slide — use only if one of these questions is asked.

Q: Will Ethernet replace CAN? A: Not in the near future. CAN and LIN are very cheap and good enough for simple nodes. What is changing is the backbone and high-bandwidth links. 10BASE-T1S is the first Ethernet type that competes with CAN on cost at the edge.

Q: Why is the reach only 15 metres? A: A car is only a few metres long, so 15 metres is enough. Designing for short reach makes the PHY simpler, cheaper and lower-power than office Ethernet's 100 metres.

Q: How is it secured? A: Several layers: VLANs separate traffic, gateways act as firewalls, MACsec encrypts and authenticates frames, TLS protects higher-level connections, and intrusion-detection systems watch for abnormal traffic. ISO/SAE 21434 requires car makers to follow a cybersecurity engineering process.

Q: Why not wireless inside the car? A: Cables give more reliable, lower-latency and more predictable communication, and are much harder to jam or eavesdrop on — essential for safety functions.`);
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
