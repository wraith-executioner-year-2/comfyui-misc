/**
 * ComfyUI / LiteGraph の graph.links 互換アクセス。
 *
 * 環境によって graph.links が
 * - plain object (id -> link)
 * - Map (id -> link) あるいは Proxy(Map)
 * のどちらにもなり得るため、共通化する。
 */

/**
 * @param {object} graph
 * @param {number|string} linkId
 * @returns {any|null}
 */
export function getGraphLink(graph, linkId) {
  const links = graph?.links
  if (!links || linkId == null) {
    return null
  }
  if (typeof links.get === "function") {
    return links.get(linkId) ?? null
  }
  return links[linkId] ?? null
}

/**
 * @param {object} graph
 * @param {(link: object, linkId?: string|number) => void} callback
 */
export function forEachGraphLink(graph, callback) {
  const links = graph?.links
  if (!links) {
    return
  }
  if (typeof links.forEach === "function") {
    links.forEach((link, linkId) => callback(link, linkId))
    return
  }
  for (const linkId of Object.keys(links)) {
    callback(links[linkId], linkId)
  }
}
