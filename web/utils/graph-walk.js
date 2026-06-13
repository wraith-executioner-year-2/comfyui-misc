import {
  COMBINE_PRIMITIVES_NODE_CLASS,
  END_FOREACH_NODE_CLASS,
  FOREACH_NODE_CLASS,
  isPrimitivesLinkType,
  PRIMITIVE_SLOT_TYPE,
  SPLIT_PRIMITIVES_NODE_CLASS,
  isRelayNodeClass,
} from "./constants.js"
import { getNodeGraph } from "./graph-context.js"
import { getGraphLink } from "./graph-links.js"

export function getNodeClassName(node) {
  return node?.comfyClass || node?.type || ""
}

export function isNodeClass(node, className) {
  return getNodeClassName(node) === className
}

export function isPrimitivePipelineNode(node) {
  const cls = getNodeClassName(node)
  return cls === FOREACH_NODE_CLASS || cls === END_FOREACH_NODE_CLASS
}

export function isPrimitiveRelayNode(node) {
  if (!node) {
    return false
  }
  const cls = getNodeClassName(node)
  if (cls.includes("Reroute") || node.type === "Reroute") {
    return true
  }
  if (isRelayNodeClass(cls)) {
    return true
  }
  const slots = [...(node.inputs || []), ...(node.outputs || [])]
  if (!slots.length) {
    return false
  }
  return slots.every(
    (slot) =>
      !slot.type || slot.type === "*" || isPrimitivesLinkType(slot.type) || slot.type === PRIMITIVE_SLOT_TYPE,
  )
}

/** @returns {Array<object>} */
function upstreamInputsToFollow(node) {
  if (isNodeClass(node, FOREACH_NODE_CLASS)) {
    const inp = node.inputs?.find((i) => i.name === "combined")
    return inp?.link ? [inp] : []
  }
  if (isNodeClass(node, END_FOREACH_NODE_CLASS)) {
    const inp = node.inputs?.find((i) => i.name === "value")
    return inp?.link ? [inp] : []
  }
  if (isPrimitiveRelayNode(node) || isPrimitivePipelineNode(node)) {
    return (node.inputs ?? []).filter((i) => i?.link)
  }
  return (node.inputs ?? []).filter((i) => i?.link)
}

export function walkUpstreamForCombineNode(node, combineNodeClass, visited, graph) {
  if (!node || visited.has(node.id)) {
    return null
  }
  visited.add(node.id)

  if (isNodeClass(node, combineNodeClass)) {
    return node
  }

  const resolvedGraph = graph ?? getNodeGraph(node)
  if (!resolvedGraph) {
    return null
  }

  for (const input of upstreamInputsToFollow(node)) {
    const link = getGraphLink(resolvedGraph, input.link)
    if (!link) {
      continue
    }
    const upstream = resolvedGraph.getNodeById(link.origin_id)
    const found = walkUpstreamForCombineNode(upstream, combineNodeClass, visited, resolvedGraph)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * combined / value 入力から Combine を上流へ辿る。
 *
 * @param {object} node
 * @param {string} combineNodeClass
 * @param {string} [inputName="combined"]
 * @returns {object|null}
 */
export function findCombineUpstream(node, combineNodeClass, inputName = "combined") {
  const input = node.inputs?.find((inp) => inp.name === inputName)
  if (!input?.link) {
    return null
  }
  const graph = getNodeGraph(node)
  if (!graph) {
    return null
  }
  const link = getGraphLink(graph, input.link)
  if (!link) {
    return null
  }
  const origin = graph.getNodeById(link.origin_id)
  if (!origin) {
    return null
  }
  if (isNodeClass(origin, combineNodeClass)) {
    return origin
  }
  return walkUpstreamForCombineNode(origin, combineNodeClass, new Set([node.id]), graph)
}

export function findDownstreamSplitNodes(node, splitNodeClass, visited, graph) {
  if (!node || visited.has(node.id)) {
    return []
  }
  visited.add(node.id)

  if (isNodeClass(node, splitNodeClass)) {
    return [node]
  }
  if (!isPrimitiveRelayNode(node) && !isPrimitivePipelineNode(node)) {
    return []
  }

  const resolvedGraph = graph ?? getNodeGraph(node)
  if (!resolvedGraph) {
    return []
  }

  const splits = []
  for (const output of node.outputs || []) {
    if (!output?.links?.length) {
      continue
    }
    for (const linkId of output.links) {
      const link = getGraphLink(resolvedGraph, linkId)
      if (!link) {
        continue
      }
      const target = resolvedGraph.getNodeById(link.target_id)
      splits.push(...findDownstreamSplitNodes(target, splitNodeClass, visited, resolvedGraph))
    }
  }
  return splits
}

export function notifyDownstreamSplitNodes(combineNode, splitNodeClass) {
  const combinedOutput = combineNode.outputs?.find((o) => o.name === "combined")
  if (!combinedOutput?.links?.length) {
    return
  }

  const graph = getNodeGraph(combineNode)
  if (!graph) {
    return
  }

  const visited = new Set([combineNode.id])
  const notified = new Set()

  for (const linkId of combinedOutput.links) {
    const link = getGraphLink(graph, linkId)
    if (!link) {
      continue
    }
    const target = graph.getNodeById(link.target_id)
    for (const split of findDownstreamSplitNodes(target, splitNodeClass, visited, graph)) {
      if (notified.has(split.id)) {
        continue
      }
      notified.add(split.id)
      split.scheduleStabilize?.()
    }
  }
}

export function propagatePrimitiveSplitSync(
  fromNode,
  combineNodeClass = COMBINE_PRIMITIVES_NODE_CLASS,
  splitNodeClass = SPLIT_PRIMITIVES_NODE_CLASS,
) {
  if (!fromNode) {
    return
  }

  const graph = getNodeGraph(fromNode)
  const visitedDown = new Set()
  for (const split of findDownstreamSplitNodes(fromNode, splitNodeClass, visitedDown, graph)) {
    split.scheduleStabilize?.()
  }

  const combine = walkUpstreamForCombineNode(fromNode, combineNodeClass, new Set(), graph)
  if (combine) {
    notifyDownstreamSplitNodes(combine, splitNodeClass)
  }
}

export function findLinkedCombineNode(splitNode, combineNodeClass) {
  return findCombineUpstream(splitNode, combineNodeClass, "combined")
}
