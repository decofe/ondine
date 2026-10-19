/** @module Chrome lane for Pele: loads each diagram type's chunk through `pele/lazy` and renders synchronously. */
import { detectType, load, render } from 'pele/lazy'
import * as Page from './Page.js'

Page.start({
  async: false,
  async prepare(source) {
    await load(detectType(source))
  },
  render(source) {
    return render(source)
  },
})
