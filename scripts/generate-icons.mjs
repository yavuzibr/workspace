import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(__dirname, '..', 'resources')
const svgPath = join(resourcesDir, 'icon.svg')
const svgBuffer = readFileSync(svgPath)

const sizes = [16, 32, 48, 64, 128, 256]

async function main() {
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer())
  )

  // Main runtime PNG (used by BrowserWindow icon at dev/runtime)
  writeFileSync(join(resourcesDir, 'icon.png'), pngBuffers[pngBuffers.length - 1])

  // Multi-resolution .ico (used by electron-builder for the Windows executable icon)
  const icoBuffer = await pngToIco(pngBuffers)
  writeFileSync(join(resourcesDir, 'icon.ico'), icoBuffer)

  console.log('Generated resources/icon.png and resources/icon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
