/**
 * The formatting commands of the WYSIWYG editor, written against the DOM Range API so that they can be tested without the component.
 *
 * Inline formats (bold, italic, underline, strikethrough) are *toggled*: a selection whose text is formatted throughout loses the format,
 * any other selection gets it, and nested duplicates are never created. Block formats (paragraph, headings) are applied to every block
 * the selection touches; text that sits directly in the editor root is wrapped into a block together with the rest of its line.
 */

export const INLINE_FORMAT_TAGS = {
    b: ['B', 'STRONG'],
    i: ['I', 'EM'],
    u: ['U'],
    s: ['S', 'STRIKE', 'DEL'],
} as const;

export type InlineFormat = keyof typeof INLINE_FORMAT_TAGS;

/** Elements the block commands work on; everything else is treated as inline content of its nearest block (or of the root) */
export const BLOCK_TAGS = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'] as const;
const HEADING_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
/** Block-level elements a root-level inline run never extends across */
const LINE_BREAKERS = [...BLOCK_TAGS, 'BR', 'UL', 'OL', 'TABLE', 'HR'];

export const DEFAULT_BLOCK_FORMAT = 'p';

function isElement(node: Node | null): node is HTMLElement {
    return node instanceof HTMLElement;
}

function hasTag(node: Node | null, tags: readonly string[]): node is HTMLElement {
    return isElement(node) && tags.includes(node.tagName);
}

/** The closest ancestor of `node` (inclusive) carrying the inline format, stopping below `root` */
export function closestInlineFormat(node: Node | null, format: InlineFormat, root: Node): HTMLElement | null {
    let current: Node | null = node;
    while (current && current !== root) {
        if (hasTag(current, INLINE_FORMAT_TAGS[format])) {
            return current;
        }
        current = current.parentNode;
    }
    return null;
}

/** The non-empty text nodes the range touches */
export function textNodesInRange(range: Range): Text[] {
    const container = range.commonAncestorContainer;
    if (container instanceof Text) {
        return container.length > 0 ? [container] : [];
    }
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node instanceof Text && node.length > 0 && range.intersectsNode(node) && !touchesOnlyAtBoundary(range, node)) {
            nodes.push(node);
        }
    }
    return nodes;
}

/** A text node the range only touches at its edge (the selection ends where the node starts, or starts where it ends) is not selected */
function touchesOnlyAtBoundary(range: Range, node: Text): boolean {
    const endsAtNodeStart = range.endContainer === node && range.endOffset === 0;
    const startsAtNodeEnd = range.startContainer === node && range.startOffset === node.length;
    return endsAtNodeStart || startsAtNodeEnd;
}

/** True when every selected text node already carries the format, so the toggle removes it */
export function isRangeFormatted(range: Range, format: InlineFormat, root: Node): boolean {
    const nodes = textNodesInRange(range);
    return nodes.length > 0 && nodes.every(node => closestInlineFormat(node, format, root) !== null);
}

/** Replaces an element by its children */
export function unwrapElement(element: Element): void {
    element.replaceWith(...Array.from(element.childNodes));
}

/** Removes every element of the format inside `scope` (keeping their content), so the content carries the format at most once */
export function stripInlineFormat(scope: ParentNode, format: InlineFormat): void {
    const selector = INLINE_FORMAT_TAGS[format].map(tag => tag.toLowerCase()).join(',');
    scope.querySelectorAll(selector).forEach(unwrapElement);
}

/** Elements that carry content of their own even without children */
const VOID_CONTENT_TAGS = ['BR', 'IMG', 'HR', 'VIDEO', 'AUDIO', 'IFRAME', 'INPUT', 'TABLE'];

/** A node without any content: an empty text node, or an element whose children are all blank (void elements are never blank) */
function isBlank(node: Node): boolean {
    if (node instanceof Text) {
        return node.length === 0;
    }
    if (hasTag(node, VOID_CONTENT_TAGS)) {
        return false;
    }
    return Array.from(node.childNodes).every(isBlank);
}

/** Removes the blank formatting elements the range operations leave behind at their boundaries (partially selected elements) */
function removeBlankFormatting(scope: ParentNode, format: InlineFormat): void {
    const selector = INLINE_FORMAT_TAGS[format].map(tag => tag.toLowerCase()).join(',');
    scope.querySelectorAll(selector).forEach(element => {
        if (isBlank(element)) {
            element.remove();
        }
    });
}

/**
 * Widens the range to whole inline elements whose entire content it covers (stopping at `stopAt`), so that formatting around the selected
 * text, for example an `<i>` around a selected word, travels with the text instead of being split into empty shells.
 */
function expandToCoveredInlineAncestors(range: Range, stopAt: Node): void {
    for (;;) {
        const container = range.commonAncestorContainer;
        const node = container instanceof Text ? container.parentNode : container;
        if (!node || node === stopAt || !isElement(node) || hasTag(node, BLOCK_TAGS)) {
            return;
        }
        if (!coversAllContent(range, node)) {
            return;
        }
        range.selectNode(node);
    }
}

/** True when nothing but blank nodes lies between the start of `node` and the range start, and between the range end and the end of `node` */
function coversAllContent(range: Range, node: Node): boolean {
    const before = document.createRange();
    before.setStart(node, 0);
    before.setEnd(range.startContainer, range.startOffset);
    const after = document.createRange();
    after.setStart(range.endContainer, range.endOffset);
    after.setEnd(node, node.childNodes.length);
    return isBlank(before.cloneContents()) && isBlank(after.cloneContents());
}

/** The block (or the root) that contains the range, the scope of the clean-ups */
function scopeOf(range: Range, root: HTMLElement): ParentNode {
    return blockElementOf(range.commonAncestorContainer, root) ?? root;
}

/**
 * Toggles an inline format on a non-collapsed range. Returns the range covering the affected content, which the caller should select so
 * that a second click toggles the format back.
 */
export function toggleInlineFormat(range: Range, format: InlineFormat, root: HTMLElement): Range {
    const scope = scopeOf(range, root);
    const result = isRangeFormatted(range, format, root) ? removeInlineFormat(range, format, root) : addInlineFormat(range, format, root);
    removeBlankFormatting(scope, format);
    return result;
}

function addInlineFormat(range: Range, format: InlineFormat, root: HTMLElement): Range {
    expandToCoveredInlineAncestors(range, root);
    const wrapper = document.createElement(format);
    const content = range.extractContents();
    stripInlineFormat(content, format);
    wrapper.appendChild(content);
    range.insertNode(wrapper);
    const selected = document.createRange();
    selected.selectNodeContents(wrapper);
    return selected;
}

function removeInlineFormat(range: Range, format: InlineFormat, root: HTMLElement): Range {
    let working = range;
    // The selection may sit inside a formatting element (possibly nested): split that element around the selection, so that the part
    // before and the part after keep the format and the selected part can be taken out of it
    for (let ancestor = closestInlineFormat(working.commonAncestorContainer, format, root); ancestor;
         ancestor = closestInlineFormat(working.commonAncestorContainer, format, root)) {
        expandToCoveredInlineAncestors(working, ancestor);
        working = splitFormatAround(working, ancestor);
    }
    expandToCoveredInlineAncestors(working, root);
    const content = working.extractContents();
    stripInlineFormat(content, format);
    const nodes = Array.from(content.childNodes);
    working.insertNode(content);
    return rangeAround(nodes, working);
}

/** Moves the selected part out of its formatting ancestor: before | selected | after, the two outer parts keeping the format */
function splitFormatAround(range: Range, ancestor: HTMLElement): Range {
    const after = document.createRange();
    after.setStart(range.endContainer, range.endOffset);
    after.setEnd(ancestor, ancestor.childNodes.length);
    const afterContent = after.extractContents();
    const selectedContent = range.extractContents();
    const selectedNodes = Array.from(selectedContent.childNodes);

    const parent = ancestor.parentNode as Node;
    const anchor = ancestor.nextSibling;
    parent.insertBefore(selectedContent, anchor);
    if (Array.from(afterContent.childNodes).some(node => !isBlank(node))) {
        const tail = ancestor.cloneNode(false) as HTMLElement;
        tail.appendChild(afterContent);
        parent.insertBefore(tail, anchor);
    }
    if (Array.from(ancestor.childNodes).every(isBlank)) {
        ancestor.remove();
    }
    return rangeAround(selectedNodes, range);
}

/** A range from the start of the first to the end of the last node, or the given fallback when there are none */
function rangeAround(nodes: Node[], fallback: Range): Range {
    const attached = nodes.filter(node => node.isConnected);
    if (attached.length === 0) {
        return fallback;
    }
    const result = document.createRange();
    result.setStartBefore(attached[0]);
    result.setEndAfter(attached[attached.length - 1]);
    return result;
}

/** The nearest block element of `node` below `root`, or null for content that sits directly in the root */
export function blockElementOf(node: Node | null, root: HTMLElement): HTMLElement | null {
    let current: Node | null = node;
    while (current && current !== root) {
        if (hasTag(current, BLOCK_TAGS)) {
            return current;
        }
        current = current.parentNode;
    }
    return null;
}

/** The child of `root` that contains `node` (or `node` itself when it is one) */
function rootChildOf(node: Node, root: HTMLElement): Node | null {
    let current: Node | null = node;
    while (current && current.parentNode !== root) {
        current = current.parentNode;
    }
    return current;
}

/** The block of the toolbar's format selector for a selection: the heading tag of its first block, else the paragraph */
export function currentBlockFormat(range: Range | null, root: HTMLElement): string {
    if (!range || !root.contains(range.startContainer)) {
        return DEFAULT_BLOCK_FORMAT;
    }
    const block = listItemOrBlock(blockElementOf(range.startContainer, root));
    if (!block) {
        return DEFAULT_BLOCK_FORMAT;
    }
    if (block.tagName === 'LI') {
        const inner = soleHeadingOf(block);
        return inner ? inner.tagName.toLowerCase() : DEFAULT_BLOCK_FORMAT;
    }
    return HEADING_TAGS.includes(block.tagName) ? block.tagName.toLowerCase() : DEFAULT_BLOCK_FORMAT;
}

/** A heading or paragraph that is the content of a list item is formatted through the item, which keeps its tag */
function listItemOrBlock(block: HTMLElement | null): HTMLElement | null {
    const parent = block?.parentElement;
    return block && parent && parent.tagName === 'LI' && hasTag(block, [...HEADING_TAGS, 'P']) ? parent : block;
}

function soleHeadingOf(container: HTMLElement): HTMLElement | null {
    const children = Array.from(container.childNodes).filter(node => !(node instanceof Text && node.data.trim() === ''));
    return children.length === 1 && hasTag(children[0], HEADING_TAGS) ? children[0] : null;
}

/**
 * Applies a block format (`p`, `h1`..`h6`) to every block the range touches. Content directly in the root is wrapped into a new block
 * together with the rest of its line (up to the surrounding blocks or line breaks); a list item keeps its `li` and gets the heading
 * inside it. The selection boundaries stay valid: nodes are moved, never copied.
 *
 * @return the mapping from replaced block elements to their replacements, for callers whose selection boundaries point at a block
 */
export function applyBlockFormat(range: Range, tagName: string, root: HTMLElement): Map<Node, Node> {
    const tag = tagName.toUpperCase();
    const replaced = new Map<Node, Node>();
    const blocks: HTMLElement[] = [];
    const rootRuns: Node[] = [];
    for (const node of nodesTouchedBy(range, root)) {
        const block = listItemOrBlock(blockElementOf(node, root));
        if (block) {
            if (!blocks.includes(block)) {
                blocks.push(block);
            }
            continue;
        }
        const rootChild = rootChildOf(node, root);
        if (rootChild && !rootRuns.includes(rootChild) && !hasTag(rootChild, LINE_BREAKERS)) {
            rootRuns.push(rootChild);
        }
    }

    for (const block of blocks) {
        if (block.tagName === 'LI') {
            formatListItem(block, tag);
            continue;
        }
        if (block.tagName === tag) {
            continue;
        }
        replaced.set(block, renameElement(block, tag));
    }

    const wrapped = new Set<Node>();
    for (const node of rootRuns) {
        if (wrapped.has(node) || !node.isConnected) {
            continue;
        }
        const run = inlineRunAround(node, root);
        run.forEach(member => wrapped.add(member));
        const wrapper = document.createElement(tag);
        root.insertBefore(wrapper, run[0]);
        run.forEach(member => wrapper.appendChild(member));
    }
    return replaced;
}

/** Every node the range touches: the common ancestor's descendants that intersect it, or the container itself for a text range */
function nodesTouchedBy(range: Range, root: HTMLElement): Node[] {
    const container = range.commonAncestorContainer;
    if (container instanceof Text || (container !== root && !container.hasChildNodes())) {
        return [container];
    }
    if (range.collapsed) {
        const child = container.childNodes[range.startOffset] ?? container.childNodes[range.startOffset - 1];
        return child ? [child] : [container];
    }
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const nodes: Node[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (range.intersectsNode(node) && !(node instanceof Text && touchesOnlyAtBoundary(range, node))) {
            nodes.push(node);
        }
    }
    return nodes.length > 0 ? nodes : [container];
}

/** The inline siblings around a root child up to the nearest block element or line break on either side, in document order */
function inlineRunAround(node: Node, root: HTMLElement): Node[] {
    const run: Node[] = [node];
    for (let previous = node.previousSibling; previous && previous.parentNode === root && !hasTag(previous, LINE_BREAKERS); previous = previous.previousSibling) {
        run.unshift(previous);
    }
    for (let next = node.nextSibling; next && next.parentNode === root && !hasTag(next, LINE_BREAKERS); next = next.nextSibling) {
        run.push(next);
    }
    return run;
}

/** A list item never changes its tag: the heading goes inside it, "Normal" takes it out again */
function formatListItem(item: HTMLElement, tag: string): void {
    const heading = soleHeadingOf(item);
    if (tag === 'P') {
        if (heading) {
            unwrapElement(heading);
        }
        return;
    }
    if (heading) {
        if (heading.tagName !== tag) {
            renameElement(heading, tag);
        }
        return;
    }
    const wrapper = document.createElement(tag);
    wrapper.append(...Array.from(item.childNodes));
    item.appendChild(wrapper);
}

/** Replaces an element by one with another tag, moving its children and keeping its attributes */
function renameElement(element: HTMLElement, tag: string): HTMLElement {
    const replacement = document.createElement(tag);
    for (const attribute of Array.from(element.attributes)) {
        replacement.setAttribute(attribute.name, attribute.value);
    }
    replacement.append(...Array.from(element.childNodes));
    element.replaceWith(replacement);
    return replacement;
}
