// The crown is narrower than loose hair. Seat each painted band on the head,
// keeping hanging ribbons and the pompom in the same proportion as the cap.
const hatBounds = {
  'hat-beret': [407, -2, 223, 214],
  'hat-blossom': [406, -8, 225, 225],
  'hat-coast': [408, -3, 223, 223],
  'hat-starlit': [406, -12, 226, 226],
  'hat-wizard': [374, -77, 292, 241],
  'hat-sprout': [411, -5, 228, 294],
  'hat-forest': [407, -37, 224, 188],
  'hat-cafe': [406, -66, 224, 233]
};

export function fittedHatTarget(id, layer) {
  return hatBounds[id] ?? layer.target;
}

// Only the fabric on the underside sits behind the fringe. Outline the
// decorated front edge separately so the bow, binding and badge stay visible.
export function hatLining(id, layer) {
  const [x, y, w, h] = fittedHatTarget(id, layer);
  const point = (u, v) => [x + u * w, y + v * h].join(' ');
  switch (id) {
    case 'hat-forest':
      return `M${point(.015,.85)} Q${point(.54,.53)} ${point(.83,.41)} Q${point(.97,.41)} ${point(.998,.61)} L${point(1,1)} H${x}Z`;
    case 'hat-wizard':
      return `M${point(.025,.63)} Q${point(.12,.45)} ${point(.34,.59)} L${point(.62,.73)} ${point(.1,.91)}Z`;
    case 'hat-sprout':
      return `M${point(.46,.36)} Q${point(.57,.39)} ${point(.59,.31)} Q${point(.62,.34)} ${point(.69,.29)} Q${point(.73,.37)} ${point(.79,.33)} L${point(.88,.43)} ${point(.83,.58)} ${point(.76,.6)}Z`;
    default:
      return null;
  }
}

// Compress just the top of a high ponytail under the crown. The fringe,
// lower ponytail and their registration against the eyes keep their positions.
export function seatedHairParts(id, hat, layer) {
  if (!hat || id !== 'hair-silver') return [[layer.source, layer.target]];
  const [sx, sy, sw, sh] = layer.source;
  const [x, y, w, h] = layer.target;
  const join = 125;
  const upper = join - y;
  const sourceUpper = sh * upper / h;
  return [
    [[sx, sy, sw, sourceUpper], [x, y + 39, w, upper - 39]],
    [[sx, sy + sourceUpper, sw, sh - sourceUpper], [x, join, w, h - upper]]
  ];
}
