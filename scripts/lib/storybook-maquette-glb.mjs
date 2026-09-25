const GL_ARRAY_BUFFER = 34962;
const GL_ELEMENT_ARRAY_BUFFER = 34963;
const GL_FLOAT = 5126;
const GL_UNSIGNED_SHORT = 5123;

function align4(value) {
  return (value + 3) & ~3;
}

function hexColor(value) {
  const normalized = String(value || "#888888").replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized.padEnd(6, "8").slice(0, 6);
  const integer = Number.parseInt(expanded, 16);
  return [
    ((integer >> 16) & 255) / 255,
    ((integer >> 8) & 255) / 255,
    (integer & 255) / 255,
    1,
  ];
}

function radians(value) {
  return (Number(value) * Math.PI) / 180;
}

function rotatePoint(point, degrees) {
  const [rx, ry, rz] = (degrees || [0, 0, 0]).map(radians);
  let [x, y, z] = point;

  let c = Math.cos(rx);
  let s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];

  c = Math.cos(ry);
  s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];

  c = Math.cos(rz);
  s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];

  return [x, y, z];
}

function boxGeometry(primitive) {
  const [sx, sy, sz] = primitive.sizeMeters;
  const [cx, cy, cz] = primitive.centerMeters;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces = [
    { normal: [0, 0, 1], corners: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { normal: [0, 0, -1], corners: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
    { normal: [1, 0, 0], corners: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
    { normal: [-1, 0, 0], corners: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
    { normal: [0, 1, 0], corners: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
    { normal: [0, -1, 0], corners: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
  ];

  const positions = [];
  const normals = [];
  const indices = [];
  for (const face of faces) {
    const base = positions.length / 3;
    const rotatedNormal = rotatePoint(face.normal, primitive.rotationDegrees);
    for (const corner of face.corners) {
      const rotated = rotatePoint(corner, primitive.rotationDegrees);
      positions.push(rotated[0] + cx, rotated[1] + cy, rotated[2] + cz);
      normals.push(...rotatedNormal);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

function includedAtLod(primitive, lod) {
  const min = Number.isInteger(primitive.minLod) ? primitive.minLod : 0;
  const max = Number.isInteger(primitive.maxLod) ? primitive.maxLod : 3;
  return lod >= min && lod <= max;
}

function toFloat32Bytes(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  return buffer;
}

function toUint16Bytes(values) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => buffer.writeUInt16LE(value, index * 2));
  return buffer;
}

function minMax3(values) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis]);
      max[axis] = Math.max(max[axis], values[index + axis]);
    }
  }
  return { min, max };
}

export function validateMaquetteAsset(asset) {
  const findings = [];
  if (!asset || typeof asset !== "object") return ["Asset spec must be an object."];
  if (!String(asset.assetId || "").trim()) findings.push("Asset ID is required.");
  if (!String(asset.placeId || "").trim()) findings.push("Canonical place ID is required.");
  if (asset.units !== "meters") findings.push("Asset units must be meters.");
  if (!Array.isArray(asset.dimensionsMeters) || asset.dimensionsMeters.length !== 3) {
    findings.push("Asset dimensions must contain exactly three meter values.");
  } else if (asset.dimensionsMeters.some((value) => !Number.isFinite(value) || value <= 0)) {
    findings.push("Asset dimensions must contain positive finite meter values.");
  }
  if (!Array.isArray(asset.primitives) || asset.primitives.length === 0) {
    findings.push("Asset must contain geometry primitives.");
  }
  for (const primitive of asset.primitives || []) {
    if (primitive.kind !== "box") findings.push(`Unsupported primitive kind ${primitive.kind}.`);
    if (!Array.isArray(primitive.sizeMeters) || primitive.sizeMeters.some((value) => !(value > 0))) {
      findings.push(`Primitive ${primitive.name || "unnamed"} requires positive meter dimensions.`);
    }
  }
  return findings;
}

export function buildMaquetteGlb(asset, lod) {
  const findings = validateMaquetteAsset(asset);
  if (findings.length) throw new Error(findings.join(" "));
  if (![0, 1, 2, 3].includes(lod)) throw new RangeError("LOD must be 0, 1, 2, or 3.");

  const primitives = asset.primitives.filter((primitive) => includedAtLod(primitive, lod));
  if (!primitives.length) throw new Error(`${asset.assetId} has no geometry for LOD${lod}.`);

  const materialNames = [...new Set(primitives.map((primitive) => primitive.material))];
  const materials = materialNames.map((name) => {
    const material = asset.materials[name] || {};
    return {
      name,
      pbrMetallicRoughness: {
        baseColorFactor: hexColor(material.color),
        metallicFactor: Number(material.metallic || 0),
        roughnessFactor: Number(material.roughness ?? 0.88),
      },
    };
  });

  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [{ name: asset.assetId, scale: [1, 1, 1], children: [] }];

  let byteOffset = 0;
  function addChunk(bytes, target) {
    const alignedOffset = align4(byteOffset);
    if (alignedOffset > byteOffset) chunks.push(Buffer.alloc(alignedOffset - byteOffset));
    byteOffset = alignedOffset;
    const view = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length, target });
    chunks.push(bytes);
    byteOffset += bytes.length;
    return view;
  }

  let triangleCount = 0;
  for (const primitive of primitives) {
    const geometry = boxGeometry(primitive);
    triangleCount += geometry.indices.length / 3;

    const positionView = addChunk(toFloat32Bytes(geometry.positions), GL_ARRAY_BUFFER);
    const normalView = addChunk(toFloat32Bytes(geometry.normals), GL_ARRAY_BUFFER);
    const indexView = addChunk(toUint16Bytes(geometry.indices), GL_ELEMENT_ARRAY_BUFFER);
    const bounds = minMax3(geometry.positions);

    const positionAccessor = accessors.length;
    accessors.push({
      bufferView: positionView,
      componentType: GL_FLOAT,
      count: geometry.positions.length / 3,
      type: "VEC3",
      min: bounds.min,
      max: bounds.max,
    });
    const normalAccessor = accessors.length;
    accessors.push({
      bufferView: normalView,
      componentType: GL_FLOAT,
      count: geometry.normals.length / 3,
      type: "VEC3",
    });
    const indexAccessor = accessors.length;
    accessors.push({
      bufferView: indexView,
      componentType: GL_UNSIGNED_SHORT,
      count: geometry.indices.length,
      type: "SCALAR",
    });

    const meshIndex = meshes.length;
    meshes.push({
      name: primitive.name,
      primitives: [
        {
          attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
          indices: indexAccessor,
          material: materialNames.indexOf(primitive.material),
          mode: 4,
        },
      ],
    });
    const nodeIndex = nodes.length;
    nodes.push({ name: primitive.name, mesh: meshIndex });
    nodes[0].children.push(nodeIndex);
  }

  const binaryLength = align4(byteOffset);
  if (binaryLength > byteOffset) chunks.push(Buffer.alloc(binaryLength - byteOffset));
  const binary = Buffer.concat(chunks);

  const json = {
    asset: { version: "2.0", generator: "Lūm storybook-maquette generator" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binary.length }],
    extras: {
      placeId: asset.placeId,
      assetId: asset.assetId,
      units: "meters",
      scaleBasis: asset.scaleBasis,
      dimensionsMeters: asset.dimensionsMeters,
      lod,
    },
  };

  let jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPaddedLength = align4(jsonBytes.length);
  if (jsonPaddedLength > jsonBytes.length) {
    jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(jsonPaddedLength - jsonBytes.length, 0x20)]);
  }

  const totalLength = 12 + 8 + jsonBytes.length + 8 + binary.length;
  const output = Buffer.alloc(totalLength);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(jsonBytes.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonBytes.copy(output, 20);
  const binaryHeader = 20 + jsonBytes.length;
  output.writeUInt32LE(binary.length, binaryHeader);
  output.writeUInt32LE(0x004e4942, binaryHeader + 4);
  binary.copy(output, binaryHeader + 8);

  return {
    buffer: output,
    report: {
      assetId: asset.assetId,
      placeId: asset.placeId,
      lod,
      triangleCount,
      byteLength: output.length,
      materialCount: materials.length,
      dimensionsMeters: [...asset.dimensionsMeters],
    },
  };
}

export function buildAssetLods(asset) {
  return [0, 1, 2, 3].map((lod) => buildMaquetteGlb(asset, lod));
}
