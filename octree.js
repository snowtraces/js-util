/**
 * 八叉树
 */
class Octree {
    constructor() {
        this.reducible = new Array(8).fill(null)
        this.leafNum = 0
        this.blockSize = 1
        this.root = new OctreeNode()
    }
}

/**
 * 可变链表节点
 */
class ReducibleNode {
    constructor(node ,next) {
        this.octreeNode = node || null;
        this.next = next || null;
    }
}

/**
* 八叉树节点
*/
class OctreeNode {
    constructor() {
        this.isLeaf = false
        this.pixelCount = 0;
        this.red = 0;
        this.green = 0;
        this.blue = 0;
        this.children = new Array(8);
    }
}

Octree.prototype.themeColor = function (imageSelector, maxNumberOfColor = 8) {
    let pixels = $.getPixels(imageSelector);
    //像素点转换成rgb颜色信息
    let i = -4
    let array = [];
    let length = pixels.length
    while ((i += this.blockSize * 4) < length) {
        array.push({
            r: pixels[i],
            g: pixels[i + 1],
            b: pixels[i + 2]
        });
    }

    // 传入颜色信息，开始建树
    this.buildOctree(array, maxNumberOfColor);

    // 叶子节点遍历，输出最终颜色
    log(this)
    let colors = []
    this.colorsStats(this.root, colors)
    
    return colors.sort((a, b) => b.count - a.count)
}

/**
 * createNode
 * @param {number} level 
 */
Octree.prototype.createNode = function (level) {
    let node = new OctreeNode();
    if (level === 7) {
        node.isLeaf = true;
        this.leafNum++;
    } else {
        this.reducible[level] = new ReducibleNode(node, this.reducible[level])
    }

    return node;
}

/**
 * addColor
 * @param {OctreeNode} node 
 * @param {Object} color 
 * @param {Number} level 
 */
Octree.prototype.addColor = function (node, color, level) {
    if (node.isLeaf) {
        // 叶子节点保存颜色信息
        node.pixelCount++;
        node.red += color.r;
        node.green += color.g;
        node.blue += color.b;
    } else {
        // 计算二进制索引
        let r = (color.r >> (7 - level)) & 1;
        let g = (color.g >> (7 - level)) & 1;
        let b = (color.b >> (7 - level)) & 1;
        let idx = (r << 2) + (g << 1) + b;

        if (!node.children[idx]) {
            node.children[idx] = this.createNode(level + 1);
        }

        this.addColor(node.children[idx], color, level + 1);
    }
}

/**
 * reduceTree
 */
Octree.prototype.reduceTree = function () {
    // find the deepest level of node
    let level = 6;
    while (null === this.reducible[level]) {
        level--
    }

    // get the node and remove it from reducible link
    let reducibleNode = this.reducible[level];
    this.reducible[level] = reducibleNode.next;

    // merge children
    let node = reducibleNode.octreeNode
    node.children.forEach(child => {
        if (child) {
            node.red += child.red
            node.green += child.green
            node.blue += child.blue
            node.pixelCount += child.pixelCount

            this.leafNum--
        }
    })

    node.isLeaf = true
    node.children = null
    this.leafNum++
}

/**
 * buildOctree
 * @param {array} pixels 
 * @param {number} maxColors 
 */
Octree.prototype.buildOctree = function (pixels, maxColors) {
    pixels.forEach(pixel => {
        this.addColor(this.root, pixel, 0)
        while (this.leafNum > maxColors) {
            this.reduceTree()
        }
    })
}

/**
 * colorsStats
 * 
 * @param {OctreeNode} node
 * @param {Object} object
 */
Octree.prototype.colorsStats = function (node, resultArray) {
    if (node.isLeaf) {
        resultArray.push(new rgb(
            ~~(node.red / node.pixelCount),
            ~~(node.green / node.pixelCount),
            ~~(node.blue / node.pixelCount),
            node.pixelCount
        ))
        return
    }

    node.children.forEach(child => {
        this.colorsStats(child, resultArray)
    })
}