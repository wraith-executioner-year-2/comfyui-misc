export function removeUnusedInputsFromEnd(node, minNumber = 1, nameMatch) {
  if (node.removed) {
    return
  }
  for (let i = node.inputs.length - 1; i >= minNumber; i--) {
    if (!node.inputs[i]?.link) {
      if (!nameMatch || nameMatch.test(node.inputs[i].name)) {
        node.removeInput(i)
      }
      continue
    }
    break
  }
}
