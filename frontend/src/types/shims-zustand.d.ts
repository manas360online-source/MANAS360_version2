declare module 'zustand' {
	function create<T = any>(fn: any): any;
	export default create;
}

declare module 'zustand/middleware' {
	export function devtools(fn: any): any;
}
