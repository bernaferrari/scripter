//
// The Scripter environment.
//
// What's declared here is available to scripts in their global namespace.
//

// symbolic type aliases
type int   = number
type float = number
type byte  = number
type bool  = boolean

/** Outputs a message to the console and on screen */
declare function print(...args :any[]) :void

/** Throws an error if condition is not thruthy */
declare function assert(condition :any, ...message :any[]) :void

/** Promise which can be cancelled */
interface CancellablePromise<T=void> extends Promise<T> { cancel():void }

/**
 * Creates a cancellable Promise.
 *
 * Example:
 * ```
 * let p = createCancellablePromise((resolve, reject, oncancel) => {
 *   let timer = setTimeout(() => resolve("ok"), 600)
 *   oncancel(() => {
 *     clearTimeout(timer)
 *     reject("cancelled")
 *   })
 * })
 * p.then(v => console.log("resolved", v))
 *  .catch(v => console.warn("rejected", v))
 * setTimeout(() => { p.cancel() }, 500)
 * ```
 */
declare function createCancellablePromise<T>(
  executor :(
    resolve  : (v? :T | PromiseLike<T>) => void,
    reject   : ((reason?:any)=>void),
    oncancel : (f:()=>void)=>void
  )=>void,
) :CancellablePromise<T>

// timer functions
declare function clearInterval(id?: number): void;
declare function clearTimeout(id?: number): void;
declare function setInterval(handler: string|Function, timeout?: number, ...arguments: any[]): number;
declare function setTimeout(handler: string|Function, timeout?: number, ...arguments: any[]): number;

/** Start a timer that expires after `duration` milliseconds */
declare function Timer(duration :number, handler? :(canceled?:boolean)=>any) :Timer
declare function timer(duration :number, handler? :(canceled?:boolean)=>any) :Timer
interface Timer<T = void> extends CancellablePromise<T> {
  cancel() :void

  then<R1=T,R2=never>(
    onfulfilled?: ((value: T) => R1|PromiseLike<R1>)|undefined|null,
    onrejected?: ((reason: any) => R2|PromiseLike<R2>)|undefined|null,
  ): Timer<R1>;

  catch(onrejected?: ((reason: any) => any|PromiseLike<any>)|undefined|null): Timer<T>;
}

declare class TimerCancellation extends Error {
  readonly name :"TimerCancellation"
}

/**
 * Adds a timeout to a cancellable process.
 * When timeout is reached, "TIMEOUT" is returned instead R.
 */
declare function withTimeout<
  T extends CancellablePromise<R>,
  R = T extends Promise<infer U> ? U : T
>(p :T, timeout :number) :CancellablePromise<R|"TIMEOUT">

/**
 * Calls f at a high frequency.
 * `time` is a monotonically-incrementing number of seconds with millisecond precision.
 * Return or throw "STOP" to end animation which resolved the promise.
 */
declare function animate(f :(time :number) => void|"STOP") :Animation;
interface Animation extends Promise<void> {
  cancel() :void
}

/** Set to true if the script was canceled by the user */
declare var canceled :boolean;

/** Ignored value */
declare var _ :any;

/**
 * Shows a modal dialog with question and yes/no buttons.
 *
 * Returns true if the user answered "yes".
 */
declare function confirm(question: string): Promise<bool>;

/** Presents a message to the user in a disruptive way. */
declare function alert(message: string): void;

// ------------------------------------------------------------------------------------
// worker

/** Create a worker */
declare function createWorker(script :string | ScripterWorkerFun) :ScripterWorker

/** Create a worker, with virtual DOM */
declare function createWorker(opt :ScripterCreateWorkerOptions & { DOM:true },
                              script :string | ScripterWorkerDOMFun) :ScripterWorker

/** Create a worker, with options */
declare function createWorker(opt :ScripterCreateWorkerOptions | undefined | null,
                              script :string | ScripterWorkerFun) :ScripterWorker


interface ScripterWorker extends Promise<void> {
  /** Event callback invoked when a message arrives from the worker */
  onmessage? :((data :any)=>void) | null

  /** Event callback invoked when a message error occurs */
  onmessageerror? :((data :any)=>void) | null

  /**
   * Event callback invoked when an error occurs.
   * When this happens, the worker should be considered defunct.
   */
  onerror? :((err :ScripterWorkerError)=>void) | null

  /** Event callback invoked when the worker closes */
  onclose? :()=>void

  /** Send a message to the worker */
  postMessage(msg :any, transfer?: Transferable[]) :void

  /** Send a message to the worker (alias for postMessage) */
  send<T=any>(msg :T, transfer?: Transferable[]) :void  // alias for postMessage

  /**
   * Receive a message from the worker. Resolves on the next message received.
   * This is an alternative to event-based message processing with `onmessage`.
   */
  recv<T=any>() :Promise<T>

  /** Request termination of the worker */
  terminate() :this
}

interface ScripterCreateWorkerOptions {
  /**
   * If true, the worker will actually run in an iframe with a full DOM.
   * Note that iframes are a little slower and blocks the UI thread.
   * This is useful for making certain libraries work which depend on DOM features,
   * like for example the popular D3 library.
   */
  DOM?: boolean
}

type ScripterWorkerFun = (self :ScripterWorkerEnv) => void|Promise<void>
type ScripterWorkerDOMFun = (self :ScripterWorkerEnv, window :any & typeof globalThis) => void|Promise<void>

interface ScripterWorkerEnv extends WindowOrWorkerGlobalScope {
  /** Close this worker */
  close(): void

  /**
   * Import scripts into the worker process.
   * Async when DOM is used. Blocking in pure web workers.
   */
  importScripts(...urls: string[]): Promise<void>

  /** Event callback invoked when a message arrives from the main Scripter script */
  onmessage? :((ev :MessageEvent)=>void) | null

  /** Event callback invoked when a message error occurs */
  onmessageerror? :((ev :MessageEvent)=>void) | null

  /** Event callback invoked when an error occurs */
  onerror? :((err :ScripterWorkerError)=>void) | null

  /** Send a message to the the main Scripter script */
  postMessage(msg :any, transfer?: Transferable[]) :void

  /** Send a message to the main Scripter script (alias for postMessage) */
  send<T=any>(msg :T, transfer?: Transferable[]) :void  // alias for postMessage

  /**
   * Receive a message from the main Scripter script.
   * Resolves on the next message received.
   * This is an alternative to event-based message processing with `onmessage`.
   */
  recv<T=any>() :Promise<T>

  /**
   * Wrapper around importScripts() for importing a script that expects a CommonJS
   * environment, i.e. module object and exports object. Returns the exported API.
   * Async when DOM is used. Blocking in pure web workers.
   */
  importCommonJS(url :string) :Promise<any>
}

interface ScripterWorkerError {
  readonly colno?: number;
  readonly error?: any;
  readonly filename?: string;
  readonly lineno?: number;
  readonly message?: string;
}

// ------------------------------------------------------------------------------------
// DOM

/** JSX interface for creating Figma nodes */
declare var DOM :DOM
interface DOM {
  /**
   * Create a node.
   * Nodes created with createElement are initially hidden and automatically
   * removed when the script ends, unless added to the scene explicitly.
   *
   * Can be used to created trees of nodes, e.g.
   *   let f = DOM.createElement(Frame, null,
   *     DOM.createElement(Rectangle),
   *     DOM.createElement(Text, {characters:"Hello", y:110}) )
   *   figma.currentPage.appendChild(f)
   */
  createElement<N extends BaseNode, P extends Partial<N>>(
    cons        :(props?:P|null)=>N,
    props?      :P | null,
    ...children :BaseNode[]
  ): N

  /**
   * Create a node by name.
   * Name starts with a lower-case character. e.g. "booleanOperation".
   */
  createElement(
    kind        :string,
    props?      :{[k:string]:any} | null,
    ...children :never[]
  ): SceneNode

  // TODO: Consider defining types for all known names.
  //       We could define a `nodeNames:{"name":RectangleNode, ...}` type which can
  //       then be used to do `keyof` to build a single type that expresses all node types.
  //
  // Note: Currently Monaco/TypeScript does not provide result type support for
  //       JSX, so doing this has little to no upside.
  //
  // createElement(
  //   kind        :"rectangle",
  //   props?      :Partial<RectangleNode> | null,
  //   ...children :never[]
  // ): RectangleNode
}


// ------------------------------------------------------------------------------------
// fetch

/**
 * Starts the process of fetching a resource from the network, returning a promise
 * which is fulfilled once the response is available.
 */
declare function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;

/** Shorthand for fetch().then(r => r.text()) */
declare function fetchText(input: RequestInfo, init?: RequestInit): Promise<string>;

/** Shorthand for fetch().then(r => r.json()) */
declare function fetchJson(input: RequestInfo, init?: RequestInit): Promise<any>;

/** Shorthand for fetch().then(r => r.arrayBuffer()).then(b => new Uint8Array(b)) */
declare function fetchData(input: RequestInfo, init?: RequestInit): Promise<Uint8Array>;

/** Shorthand for fetchData().then(data => Img(data)) */
declare function fetchImg(input: RequestInfo, init?: RequestInit): Promise<Img>;


// ------------------------------------------------------------------------------------
// Img

/** Drawable image. Accepts a URL or image data. Can be passed to print for display. */
interface Img<DataType=null|Uint8Array> {
  type        :string      // mime type
  width       :number      // 0 means "unknown"
  height      :number      // 0 means "unknown"
  pixelWidth  :number      // 0 means "unknown"
  pixelHeight :number      // 0 means "unknown"
  source      :string|Uint8Array // url or image data
  data        :DataType    // image data if loaded

  /** Type-specific metadata. Populated when image data is available. */
  meta :{[k:string]:any}

  /** Load the image. Resolves immediately if source is Uint8Array. */
  load() :Promise<Img<Uint8Array>>

  /** Get Figma image. Cached. Calls load() if needed to load the data. */
  getImage() :Promise<Image>

  /** Create a rectangle node with the image as fill, scaleMode defaults to "FIT". */
  toRectangle(scaleMode? :"FILL" | "FIT" | "CROP" | "TILE") :Promise<RectangleNode>
}
interface ImgOptions {
  type?   :string  // mime type
  width?  :number
  height? :number
}
interface ImgConstructor {
  new(data :ArrayBufferLike|Uint8Array|ArrayLike<number>, optionsOrWidth? :ImgOptions|number): Img<Uint8Array>;
  new(url :string, optionsOrWidth? :ImgOptions|number): Img<null>;
  (data :ArrayBufferLike|Uint8Array|ArrayLike<number>, optionsOrWidth? :ImgOptions|number): Img<Uint8Array>;
  (url :string, optionsOrWidth? :ImgOptions|number): Img<null>;
}
declare var Img: ImgConstructor;


// ------------------------------------------------------------------------------------
// path, file, data

declare namespace Path {
  /** Returns the filename extension without ".". Returns "" if none. */
  function ext(name :string) :string

  /** Returns the directory part of the path. E.g. "/foo/bar/baz" => "/foo/bar" */
  function dir(path :string) :string

  /** Returns the base of the path. E.g. "/a/b" => "b" */
  function base(path :string) :string

  /** Cleans up the pathname. E.g. "a/c//b/.." => "a/c" */
  function clean(path :string) :string

  /** True if the path is absolute */
  function isAbs(path :string) :bool

  /** Returns a path with paths joined together. E.g. ["foo/", "//bar", "baz"] => "foo/bar/baz" */
  function join(...paths :string[]) :string
  function join(paths :string[]) :string

  /** Returns a list of path components. E.g. "/foo//bar/" => ["", "foo", "bar"] */
  function split(path :string) :string[]
}

/**
 * Inspects the header (first ~20 or so bytes) of data to determine the type of file.
 * Similar to the POSIX "file" program. Returns null if unknown.
 */
declare function fileType(data :ArrayLike<byte>|ArrayBuffer) :FileTypeInfo|null
/** Returns mime type and other information for the file, based on the provided filename. */
declare function fileType(filename :string) :FileTypeInfo|null
/** Data returned by the fileType function, describing a type of file data */
interface FileTypeInfo {
  type :string    // mime type
  exts :string[]  // filename extensions
  description? :string
}


/**
 * Returns a Uint8Array of the input.
 * If the input is a string, it's expected to be a description of bytes, not a literal.
 * Example: "FF a7 0x9, 4" (whitespace, linebreaks and comma are ignored)
 * If the input is some kind of list, it is converted if needed to a Uint8Array.
 */
declare function Bytes(input :string|ArrayLike<byte>|ArrayBuffer|Iterable<byte>) :Uint8Array


// ------------------------------------------------------------------------------------
// Figma

/** A node that may have children */
type ContainerNode = BaseNode & ChildrenMixin

// [All nodes which extends DefaultShapeMixin]
/** Shape is a node with visible geometry. I.e. may have fill, stroke etc. */
type Shape = BooleanOperationNode
           | EllipseNode
           | LineNode
           | PolygonNode
           | RectangleNode
           | StarNode
           | TextNode
           | VectorNode

/** Get the current selection in Figma */
declare function selection() :ReadonlyArray<SceneNode>;
/** Get the nth currently-selected node in Figma */
declare function selection(index :number) :SceneNode|null;

/** Set the current selection. Non-selectable nodes of n, like pages, are ignored. */
declare function setSelection<T extends BaseNode|null|undefined|ReadonlyArray<BaseNode|null|undefined>>(n :T) :T;

/** Version of Figma plugin API that is currently in use */
declare var apiVersion :string

/** Viewport */
declare var viewport :ViewportAPI

/** The "MIXED" symbol (figma.mixed), signifying "mixed properties" */
declare var MIXED :symbol

/** Current page. Equivalent to figma.currentPage */
declare var currentPage :PageNode

/**
 * Add node to current page.
 * Equivalent to `(figma.currentPage.appendChild(n),n)`
 */
declare function addToPage<N extends SceneNode>(n :N) :N

/**
 * Store data on the user's local machine. Similar to localStorage.
 * Data may disappear if user clears their web browser cache.
 */
declare var clientStorage: ClientStorageAPI

type NodeProps<N> = Partial<Omit<N,"type">>

// Node constructors
// Essentially figma.createNodeType + optional assignment of props
//
/** Creates a new Page */
declare function Page(props? :NodeProps<PageNode>|null, ...children :SceneNode[]): PageNode;
/** Creates a new Rectangle */
declare function Rectangle(props? :NodeProps<RectangleNode>) :RectangleNode;
/** Creates a new Line */
declare function Line(props? :NodeProps<LineNode>|null): LineNode;
/** Creates a new Ellipse */
declare function Ellipse(props? :NodeProps<EllipseNode>|null): EllipseNode;
/** Creates a new Polygon */
declare function Polygon(props? :NodeProps<PolygonNode>|null): PolygonNode;
/** Creates a new Star */
declare function Star(props? :NodeProps<StarNode>|null): StarNode;
/** Creates a new Vector */
declare function Vector(props? :NodeProps<VectorNode>|null): VectorNode;
/** Creates a new Text */
declare function Text(props? :NodeProps<TextNode>|null): TextNode;
/** Creates a new BooleanOperation */
declare function BooleanOperation(props? :NodeProps<BooleanOperationNode>|null): BooleanOperationNode;
/** Creates a new Frame */
declare function Frame(props? :NodeProps<FrameNode>|null, ...children :SceneNode[]): FrameNode;
/** Creates a new Group. If parent is not provided, the first child's parent is used for the group. */
declare function Group(props :NodeProps<GroupNode & {index :number}>|null, ...children :SceneNode[]): GroupNode;
declare function Group(...children :SceneNode[]): GroupNode;
/** Creates a new Component */
declare function Component(props? :NodeProps<ComponentNode>|null, ...children :SceneNode[]): ComponentNode;
/** Creates a new Slice */
declare function Slice(props? :NodeProps<SliceNode>|null): SliceNode;
/** Creates a new PaintStyle */
declare function PaintStyle(props? :NodeProps<PaintStyle>|null): PaintStyle;
/** Creates a new TextStyle */
declare function TextStyle(props? :NodeProps<TextStyle>|null): TextStyle;
/** Creates a new EffectStyle */
declare function EffectStyle(props? :NodeProps<EffectStyle>|null): EffectStyle;
/** Creates a new GridStyle */
declare function GridStyle(props? :NodeProps<GridStyle>|null): GridStyle;



// Type guards, nodes
//
/** Checks if node is of type Document */
declare function isDocument(n :BaseNode|null|undefined) :n is DocumentNode;
/** Checks if node is of type Page */
declare function isPage(n :BaseNode|null|undefined) :n is PageNode;
/** Checks if node is of type Rectangle */
declare function isRectangle(n :BaseNode|null|undefined) :n is RectangleNode;
/** Checks if node is of type Rectangle */
declare function isRect(n :BaseNode|null|undefined) :n is RectangleNode;
/** Checks if node is of type Line */
declare function isLine(n :BaseNode|null|undefined): n is LineNode;
/** Checks if node is of type Ellipse */
declare function isEllipse(n :BaseNode|null|undefined): n is EllipseNode;
/** Checks if node is of type Polygon */
declare function isPolygon(n :BaseNode|null|undefined): n is PolygonNode;
/** Checks if node is of type Star */
declare function isStar(n :BaseNode|null|undefined): n is StarNode;
/** Checks if node is of type Vector */
declare function isVector(n :BaseNode|null|undefined): n is VectorNode;
/** Checks if node is of type Text */
declare function isText(n :BaseNode|null|undefined): n is TextNode;
/** Checks if node is of type BooleanOperation */
declare function isBooleanOperation(n :BaseNode|null|undefined): n is BooleanOperationNode;
/** Checks if node is of type Frame */
declare function isFrame(n :BaseNode|null|undefined): n is FrameNode;
/** Checks if node is of type Group */
declare function isGroup(n :BaseNode|null|undefined): n is GroupNode;
/** Checks if node is of type Component */
declare function isComponent(n :BaseNode|null|undefined): n is ComponentNode;
/** Checks if node is of type Component */
declare function isInstance(n :BaseNode|null|undefined): n is InstanceNode;
/** Checks if node is of type Slice */
declare function isSlice(n :BaseNode|null|undefined): n is SliceNode;
/** Checks if node is a type of SceneNode */
declare function isSceneNode(n :BaseNode|null|undefined): n is SceneNode;
/** Checks if node is a type with children */
declare function isContainerNode(n :BaseNode|null|undefined): n is ContainerNode;
/** Checks if node is a Shape */
declare function isShape(n :BaseNode|null|undefined): n is Shape;

/**
 * Returns true if n is a shape with at least one visible image.
 * If a layer has an "image" icon in Figma, this returns true.
 */
declare function isImage<N extends Shape>(n :N) :n is N & { fills :ReadonlyArray<Paint> }; // fills not mixed
declare function isImage(n :BaseNode) :n is Shape & { fills :ReadonlyArray<Paint> }; // fills not mixed

// Type guards, paints
//
/** Checks if paint is an image */
declare function isImage(p :Paint|null|undefined) :p is ImagePaint;
/** Checks if paint is a gradient */
declare function isGradient(p :Paint|null|undefined) :p is GradientPaint;
/** Checks if paint is a solid color */
declare function isSolidPaint(p :Paint|null|undefined) :p is SolidPaint;

// Type guards, styles
//
/** Checks if style is a paint style */
declare function isPaintStyle(s :BaseStyle|null|undefined) :p is PaintStyle;
/** Checks if style is a text style */
declare function isTextStyle(s :BaseStyle|null|undefined) :p is TextStyle;
/** Checks if style is a effect style */
declare function isEffectStyle(s :BaseStyle|null|undefined) :p is EffectStyle;
/** Checks if style is a grid style */
declare function isGridStyle(s :BaseStyle|null|undefined) :p is GridStyle;

interface Color extends RGB { // compatible with RGB interface
  readonly r: number
  readonly g: number
  readonly b: number
  withAlpha(a :number) :ColorWithAlpha
  readonly paint :SolidPaint
}
interface ColorWithAlpha extends Color, RGBA { // compatible with RGBA interface
  readonly a: number
  withoutAlpha() :Color
}

/** Create a color with alpha channel. Values should be in range [0-1]. */
declare function Color(r :number, g: number, b :number, a :number) :ColorWithAlpha;

/** Create a color. Values should be in range [0-1]. */
declare function Color(r :number, g: number, b :number) :Color;

/**
 * Create a color from hexadecimal string.
 * hexstr should be in the format "RRGGBB", "RGB" or "HH" for greyscale.
 * Examples: C800A1, C0A, CC
 */
declare function Color(hexstr :string) :Color;

/** Create a color. Values should be in range [0-1]. */
declare function RGB(r :number, g: number, b :number) :Color;

/** Create a color with alpha channel. Values should be in range [0-1]. */
declare function RGBA(r :number, g: number, b :number, a? :number) :ColorWithAlpha;

// common colors
/** #000000 Color(0   , 0   , 0)   */ declare const BLACK   :Color;
/** #FFFFFF Color(1   , 1   , 1)   */ declare const WHITE   :Color;
/** #808080 Color(0.5 , 0.5 , 0.5) */ declare const GREY    :Color;
/** #808080 Color(0.5 , 0.5 , 0.5) */ declare const GRAY    :Color;
/** #FF0000 Color(1   , 0   , 0)   */ declare const RED     :Color;
/** #00FF00 Color(0   , 1   , 0)   */ declare const GREEN   :Color;
/** #0000FF Color(0   , 0   , 1)   */ declare const BLUE    :Color;
/** #00FFFF Color(0   , 1   , 1)   */ declare const CYAN    :Color;
/** #FF00FF Color(1   , 0   , 1)   */ declare const MAGENTA :Color;
/** #FFFF00 Color(1   , 1   , 0)   */ declare const YELLOW  :Color;
/** #FF8000 Color(1   , 0.5 , 0)   */ declare const ORANGE  :Color;


// ------------------------------------------------------------------------------------
// find & visit


/** Returns the first node encountered in scope which the predicate returns */
declare function findOne<R extends SceneNode>(scope :BaseNode, p :(n :PageNode|SceneNode) => R|false) :R|null
/** Returns the first node encountered in scope for which predicate returns a truthy value for */
declare function findOne(scope :DocumentNode, p :(n :PageNode|SceneNode) => boolean|undefined) :PageNode|SceneNode|null
/** Returns the first node encountered in scope for which predicate returns a truthy value for */
declare function findOne(scope :PageNode|SceneNode, p :(n :SceneNode) => boolean|undefined) :SceneNode|null

/** Returns the first node on the current page which the predicate returns */
declare function findOne<R extends SceneNode>(p :(n :SceneNode) => R|false) :R|null
/** Returns the first node on the current page for which predicate returns a truthy value for */
declare function findOne(p :(n :SceneNode) => boolean|undefined) :SceneNode|null


/**
 * find traverses the tree represented by node and
 * returns a list of all nodes for which predicate returns true.
 *
 * The predicate is not called for `node` when its a single node,
 * but when `node` is an array, predicate is called for each item in `node`.
 */
declare function find<R extends BaseNode>(
  node :ContainerNode|ReadonlyArray<BaseNode>,
  predicate :(n :BaseNode) => R|false,
  options? :FindOptions,
) :Promise<R[]>

declare function find(
  node :ContainerNode|ReadonlyArray<BaseNode>,
  predicate :(n :BaseNode) => boolean|undefined,
  options? :FindOptions,
) :Promise<BaseNode[]>

/**
 * find traverses the current page and
 * returns a list of all nodes for which predicate returns true.
 *
 * The predicate is not called for `node` when its a single node,
 * but when `node` is an array, predicate is called for each item in `node`.
 */
declare function find<R extends BaseNode>(
  predicate :(n :BaseNode) => R|false,
  options? :FindOptions,
) :Promise<R[]>

declare function find(
  predicate :(n :BaseNode) => boolean|undefined,
  options? :FindOptions,
) :Promise<BaseNode[]>


/**
 * visit traverses the tree represented by node, calling visitor for each node.
 *
 * If the visitor returns false for a node with children, that
 * node's children will not be visited. This allows efficient searching
 * where you know that you can skip certain branches.
 *
 * Note: visitor is not called for the initial `node` argument.
 */
declare function visit(
  node :ContainerNode|ReadonlyArray<ContainerNode>,
  visitor :(n :BaseNode) => any,
) :Promise<void>;


/** Options to find() */
interface FindOptions {
  includeHidden? :boolean  // include hidden layers
}

/**
 * Returns a sequence of numbers in the range [start–end),
 * incrementing in steps or 1 if steps is not provided.
 *
 * Note that the last value may be smaller than end, depending on the value of step.
 */
declare function range(start :number, end :number, step? :number) :LazySeq<number,number,number>

/** Returns a sequence of numbers in the range [0–end) */
declare function range(end :number) :LazySeq<number,number,number>

/** Sequence which values are computed lazily; as requested */
interface LazySeq<T, OffsT = T|undefined, LenT = number|undefined> extends Iterable<T> {
  readonly length :LenT  // Infinity if unbounded
  map<R>(f :(value :T, index :number)=>R) :R[]
  array() :T[]
  at(index :number) :OffsT
  join(glue :string) :string
}


// ------------------------------------------------------------------------------------
declare namespace scripter {

  /** Visualize print() results inline in editor. Defaults to true */
  var visualizePrint :bool

  /** Close scripter, optionally showing a message (e.g. reason, status, etc) */
  function close(message? :string) :void

  /** Register a function to be called when the script ends */
  function addEndCallback(f :Function) :void

  /** Unregister a function to be called when the script ends */
  function removeEndCallback(f :Function) :void

  /** A function to be called when the script ends */
  var onend :()=>void
}


// ------------------------------------------------------------------------------------
declare namespace libui {

  /** Presents a short ambient message to the user, at the bottom of the screen */
  function notify(message: string, options?: NotificationOptions): NotificationHandler

  /**
   * Shows a range slider inline with the code.
   *
   * Yields values as the user interacts with the slider. Iteration ends when the user
   * either closes the UI control or stops the script.
   */
  function rangeInput(init? :UIRangeInit) :UIInputIterator<number>

  /** Initial options for rangeInput */
  interface UIRangeInit {
    value? :number
    min?   :number
    max?   :number
    step?  :number
  }
}


interface UIInputIterator<T> extends AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T,T>;
}


// ------------------------------------------------------------------------------------
declare namespace libgeometry {
  class Rect {
    x      :number
    y      :number
    width  :number
    height :number

    constructor(x :number, y :number, width :number, height :number)

    position() :Vec
    containsPoint(v :Vec)
    translate(v :Vec)
  }

  class Vec implements Vector {
    x :number
    y :number

    constructor(x :number, y :number)
    constructor(v :Vector)

    isInside(r :Rect) :bool
    distanceTo(v :Vec) :number
    sub(v :Vec|number) :Vec
    add(v :Vec|number) :Vec
    mul(v :Vec|number) :Vec
    div(v :Vec|number) :Vec
  }

}


// ------------------------------------------------------------------------------------
declare namespace libvars {
  interface Var<T> {
    value :T
    showSlider(init? :libui.UIRangeInit) :Promise<number>
  }

  class VarBindings {
    /** coalesceDuration: group changes happening within milliseconds into one update */
    constructor(coalesceDuration? :number)

    /** Add a variable */
    addVar<T>(value :T) :Var<T>

    /** Add multiple variables */
    addVars<T>(count :number, value :T) :Var<T>[]

    /** Remove a variable */
    removeVar(v :Var<any>)

    /** Remove all variables */
    removeAllVars()

    /** Read updates. Ends when all vars are removed. */
    updates() :AsyncIterableIterator<void>
  }
}


// ------------------------------------------------------------------------------------
declare namespace Base64 {
  /** Encode data as base-64 */
  function encode(data :Uint8Array|ArrayBuffer|string) :string

  /** Decode base-64 encoded data */
  function decode(encoded :string) :Uint8Array
}


// ------------------------------------------------------------------------------------
// Patch TS env since Monaco doesn't seem to work with "libs" in TS compiler settigs.

// lib.es2018 async iterator
interface SymbolConstructor {
  readonly asyncIterator: symbol;
}
interface AsyncIterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext | PromiseLike<TNext>]): Promise<IteratorResult<T, TReturn>>;
  return?(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>>;
  throw?(e?: any): Promise<IteratorResult<T, TReturn>>;
}
interface AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>;
}
interface AsyncIterableIterator<T> extends AsyncIterator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
