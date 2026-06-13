/**
 * combined データの pack / unpack（Python utils/primitives_data.py と同等）
 */

export function packCombinedPrimitives(values, types) {
  return { values: [...values], types: [...types] }
}

export function unpackCombinedPrimitives(combined) {
  if (!combined || typeof combined !== "object") {
    return { values: [], types: [], length: 0 }
  }
  const values = combined.values ?? []
  const types = combined.types ?? []
  const typeList = [...types]
  while (typeList.length < values.length) {
    typeList.push("STRING")
  }
  return { values: [...values], types: typeList, length: values.length }
}
