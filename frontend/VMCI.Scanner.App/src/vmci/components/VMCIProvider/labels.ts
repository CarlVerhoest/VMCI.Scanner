/**
 * Every component's labels, keyed by the name used in `<VMCIProvider labels={…}>`.
 *
 * Empty on purpose: each component registers its own key in its `<Naam>.labels.ts` via
 * declaration merging (`declare module '../VMCIProvider/labels'`). That way this core file
 * imports no component, and a component can be copied into an app on its own
 * (docs/conventies.md §4).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled by declaration merging
export interface VMCILabelRegistry {}

export type VMCILabelKey = keyof VMCILabelRegistry

/** Overrides for any subset of components and any subset of their texts. */
export type VMCILabelOverrides = {
  [K in VMCILabelKey]?: Partial<VMCILabelRegistry[K]>
}
