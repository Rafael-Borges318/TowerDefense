import Phaser from 'phaser'
import { CODEX_ENEMIES, CODEX_TOWERS, type CodexTab } from '../data/codexData'

export abstract class BaseScene extends Phaser.Scene {
  protected makeBtn(
    x: number, y: number,
    label: string,
    bgColor: number,
    color: string,
    cb: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontSize: '20px', color,
      backgroundColor: Phaser.Display.Color.IntegerToColor(bgColor).rgba,
      padding: { x: 28, y: 11 }, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btn.on('pointerover', () => btn.setAlpha(0.8))
    btn.on('pointerout',  () => btn.setAlpha(1))
    btn.on('pointerdown', cb)
    return btn
  }

  protected openCodexPanel(
    tab: CodexTab,
    switchTab: (t: CodexTab) => void,
  ): Phaser.GameObjects.Container {
    const PX = 150, PY = 70, PW = 500, PH = 420
    const HEADER_H = 80
    const VISIBLE_H = PH - HEADER_H  // 340
    const ENTRY_H = 110
    const contentTop = PY + HEADER_H  // 150

    const c = this.add.container(0, 0).setDepth(90)

    const bg = this.add.graphics()
    bg.fillStyle(0x080f20, 0.97)
    bg.fillRoundedRect(PX, PY, PW, PH, 12)
    bg.lineStyle(2, 0x4a6aaa)
    bg.strokeRoundedRect(PX, PY, PW, PH, 12)
    c.add(bg)

    c.add(this.add.text(PX + PW / 2, PY + 18, '📖  Codex — Guia do Jogo', {
      fontSize: '17px', color: '#ddc880', fontStyle: 'bold',
    }).setOrigin(0.5))

    const tabDefs: { key: CodexTab; label: string }[] = [
      { key: 'enemies', label: '⚔  Inimigos' },
      { key: 'towers',  label: '🏹  Torres'  },
    ]
    tabDefs.forEach(({ key, label }, i) => {
      const active = key === tab
      const tx = PX + 20 + i * 240
      const tabBg = this.add.graphics()
      tabBg.fillStyle(active ? 0x2a3f6a : 0x111828)
      tabBg.fillRoundedRect(tx, PY + 42, 220, 26, 5)
      if (active) { tabBg.lineStyle(1, 0x4a6aaa); tabBg.strokeRoundedRect(tx, PY + 42, 220, 26, 5) }
      c.add(tabBg)
      const tabTxt = this.add.text(tx + 110, PY + 55, label, {
        fontSize: '13px', color: active ? '#ffffff' : '#667799',
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
      tabTxt.on('pointerdown', () => { c.destroy(); switchTab(key) })
      c.add(tabTxt)
    })

    const totalH = (tab === 'enemies' ? CODEX_ENEMIES : CODEX_TOWERS).length * ENTRY_H
    const maxScroll = Math.max(0, totalH - VISIBLE_H)
    let scrollY = 0

    const cg = this.add.container(PX, contentTop)
    c.add(cg)

    const maskShape = this.make.graphics()
    maskShape.fillRect(PX, contentTop, PW, VISIBLE_H)
    cg.setMask(maskShape.createGeometryMask())

    if (tab === 'enemies') {
      CODEX_ENEMIES.forEach(({ name, imageKey, imageFrame, imageTint, textColor, lines }, i) => {
        const ly = i * ENTRY_H

        const isBoss = imageKey === 'boss_walk_0'
        const sz = isBoss ? 56 : 110
        const ix = isBoss ? 30 : 46
        const img = this.add.image(ix, ly + 44, imageKey, imageFrame)
        img.setDisplaySize(sz, sz)
        if (imageTint !== undefined) img.setTint(imageTint)
        cg.add(img)

        cg.add(this.add.text(106, ly + 7, name, { fontSize: '15px', color: textColor, fontStyle: 'bold' }))
        lines.forEach((line, j) => {
          cg.add(this.add.text(106, ly + 28 + j * 18, `• ${line}`, { fontSize: '11px', color: '#99aacc' }))
        })

        if (i < CODEX_ENEMIES.length - 1) {
          const sep = this.add.graphics()
          sep.lineStyle(1, 0x2a3550, 0.7)
          sep.lineBetween(10, ly + ENTRY_H - 3, PW - 20, ly + ENTRY_H - 3)
          cg.add(sep)
        }
      })
    } else {
      CODEX_TOWERS.forEach(({ name, sqColor, textColor, lines }, i) => {
        const ly = i * ENTRY_H

        const sq = this.add.graphics()
        sq.fillStyle(sqColor, 1); sq.fillRect(14, ly + 18, 34, 34)
        sq.lineStyle(1, 0xffffff, 0.2); sq.strokeRect(14, ly + 18, 34, 34)
        cg.add(sq)

        cg.add(this.add.text(62, ly + 7, name, { fontSize: '15px', color: textColor, fontStyle: 'bold' }))
        lines.forEach((line, j) => {
          cg.add(this.add.text(62, ly + 28 + j * 18, `• ${line}`, { fontSize: '11px', color: '#99aacc' }))
        })

        if (i < CODEX_TOWERS.length - 1) {
          const sep = this.add.graphics()
          sep.lineStyle(1, 0x2a3550, 0.7)
          sep.lineBetween(10, ly + ENTRY_H - 3, PW - 20, ly + ENTRY_H - 3)
          cg.add(sep)
        }
      })
    }

    // Scrollbar (enemies tab: 4×110=440 > 340 visible → needs scroll)
    let wheelFn: (...args: any[]) => void = () => {}
    if (maxScroll > 0) {
      const thumbH = Math.max(30, Math.round(VISIBLE_H * VISIBLE_H / totalH))

      const track = this.add.graphics()
      track.fillStyle(0x1a2a4a, 0.5)
      track.fillRoundedRect(PX + PW - 11, contentTop + 2, 6, VISIBLE_H - 4, 3)
      c.add(track)

      const thumb = this.add.graphics()
      const drawThumb = () => {
        thumb.clear()
        thumb.fillStyle(0x4a7acc, 0.85)
        const ty = contentTop + 2 + (scrollY / maxScroll) * (VISIBLE_H - thumbH - 4)
        thumb.fillRoundedRect(PX + PW - 11, ty, 6, thumbH, 3)
      }
      drawThumb()
      c.add(thumb)

      wheelFn = (_p: any, _o: any, _dx: number, dy: number) => {
        scrollY = Math.max(0, Math.min(maxScroll, scrollY + dy * 0.4))
        cg.setY(contentTop - scrollY)
        drawThumb()
      }
      this.input.on('wheel', wheelFn)

      c.add(this.add.text(PX + PW / 2, PY + PH - 8, '↕ scroll', {
        fontSize: '9px', color: '#334466',
      }).setOrigin(0.5, 1))
    }

    c.on('destroy', () => {
      this.input.off('wheel', wheelFn)
      maskShape.destroy()
    })

    const closeBtn = this.add.text(PX + PW - 10, PY + 8, '✕', {
      fontSize: '14px', color: '#ff6666',
    }).setOrigin(1, 0).setInteractive({ cursor: 'pointer' })
    closeBtn.on('pointerdown', () => c.destroy())
    c.add(closeBtn)

    return c
  }
}
