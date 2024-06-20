//=============================================================================
// rmmz_windows.js v1.8.0
//=============================================================================

//-----------------------------------------------------------------------------
// Window_Base
//
// The superclass of all windows within the game.

class Window_Base extends Window {
    initialize(rect) {
        super.initialize();
        this.loadWindowskin();
        this.checkRectObject(rect);
        this.move(rect.x, rect.y, rect.width, rect.height);
        this.updatePadding();
        this.updateBackOpacity();
        this.updateTone();
        this.createContents();
        this._opening = false;
        this._closing = false;
        this._dimmerSprite = null;
    }
    destroy(options) {
        this.destroyContents();
        if (this._dimmerSprite) {
            this._dimmerSprite.bitmap.destroy();
        }
        super.destroy(options);
    }
    checkRectObject(rect) {
        if (typeof rect !== "object" || !("x" in rect)) {
            // Probably MV plugin is used
            throw new Error("Argument must be a Rectangle");
        }
    }
    lineHeight() {
        return 36;
    }
    itemWidth() {
        return this.innerWidth;
    }
    itemHeight() {
        return this.lineHeight();
    }
    itemPadding() {
        return 8;
    }
    baseTextRect() {
        const rect = new Rectangle(0, 0, this.innerWidth, this.innerHeight);
        rect.pad(-this.itemPadding(), 0);
        return rect;
    }
    loadWindowskin() {
        this.windowskin = ImageManager.loadSystem("Window");
    }
    updatePadding() {
        this.padding = $gameSystem.windowPadding();
    }
    updateBackOpacity() {
        this.backOpacity = $gameSystem.windowOpacity();
    }
    fittingHeight(numLines) {
        return numLines * this.itemHeight() + $gameSystem.windowPadding() * 2;
    }
    updateTone() {
        const tone = $gameSystem.windowTone();
        this.setTone(tone[0], tone[1], tone[2]);
    }
    createContents() {
        const width = this.contentsWidth();
        const height = this.contentsHeight();
        this.destroyContents();
        this.contents = new Bitmap(width, height);
        this.contentsBack = new Bitmap(width, height);
        this.resetFontSettings();
    }
    destroyContents() {
        if (this.contents) {
            this.contents.destroy();
        }
        if (this.contentsBack) {
            this.contentsBack.destroy();
        }
    }
    contentsWidth() {
        return this.innerWidth;
    }
    contentsHeight() {
        return this.innerHeight;
    }
    resetFontSettings() {
        this.contents.fontFace = $gameSystem.mainFontFace();
        this.contents.fontSize = $gameSystem.mainFontSize();
        this.resetTextColor();
    }
    resetTextColor() {
        this.changeTextColor(ColorManager.normalColor());
        this.changeOutlineColor(ColorManager.outlineColor());
    }
    update() {
        Window.prototype.update.call(this);
        this.updateTone();
        this.updateOpen();
        this.updateClose();
        this.updateBackgroundDimmer();
    }
    updateOpen() {
        if (this._opening) {
            this.openness += 32;
            if (this.isOpen()) {
                this._opening = false;
            }
        }
    }
    updateClose() {
        if (this._closing) {
            this.openness -= 32;
            if (this.isClosed()) {
                this._closing = false;
            }
        }
    }
    open() {
        if (!this.isOpen()) {
            this._opening = true;
        }
        this._closing = false;
    }
    close() {
        if (!this.isClosed()) {
            this._closing = true;
        }
        this._opening = false;
    }
    isOpening() {
        return this._opening;
    }
    isClosing() {
        return this._closing;
    }
    show() {
        this.visible = true;
    }
    hide() {
        this.visible = false;
    }
    activate() {
        this.active = true;
    }
    deactivate() {
        this.active = false;
    }
    systemColor() {
        return ColorManager.systemColor();
    }
    translucentOpacity() {
        return 160;
    }
    changeTextColor(color) {
        this.contents.textColor = color;
    }
    changeOutlineColor(color) {
        this.contents.outlineColor = color;
    }
    changePaintOpacity(enabled) {
        this.contents.paintOpacity = enabled ? 255 : this.translucentOpacity();
    }
    drawRect(x, y, width, height) {
        const outlineColor = this.contents.outlineColor;
        const mainColor = this.contents.textColor;
        this.contents.fillRect(x, y, width, height, outlineColor);
        this.contents.fillRect(x + 1, y + 1, width - 2, height - 2, mainColor);
    }
    drawText(text, x, y, maxWidth, align) {
        this.contents.drawText(text, x, y, maxWidth, this.lineHeight(), align);
    }
    textWidth(text) {
        return this.contents.measureTextWidth(text);
    }
    drawTextEx(text, x, y, width) {
        this.resetFontSettings();
        const textState = this.createTextState(text, x, y, width);
        this.processAllText(textState);
        return textState.outputWidth;
    }
    textSizeEx(text) {
        this.resetFontSettings();
        const textState = this.createTextState(text, 0, 0, 0);
        textState.drawing = false;
        this.processAllText(textState);
        return { width: textState.outputWidth, height: textState.outputHeight };
    }
    createTextState(text, x, y, width) {
        const rtl = Utils.containsArabic(text);
        const textState = {};
        textState.text = this.convertEscapeCharacters(text);
        textState.index = 0;
        textState.x = rtl ? x + width : x;
        textState.y = y;
        textState.width = width;
        textState.height = this.calcTextHeight(textState);
        textState.startX = textState.x;
        textState.startY = textState.y;
        textState.rtl = rtl;
        textState.buffer = this.createTextBuffer(rtl);
        textState.drawing = true;
        textState.outputWidth = 0;
        textState.outputHeight = 0;
        return textState;
    }
    processAllText(textState) {
        while (textState.index < textState.text.length) {
            this.processCharacter(textState);
        }
        this.flushTextState(textState);
    }
    flushTextState(textState) {
        const text = textState.buffer;
        const rtl = textState.rtl;
        const width = this.textWidth(text);
        const height = textState.height;
        const x = rtl ? textState.x - width : textState.x;
        const y = textState.y;
        if (textState.drawing) {
            this.contents.drawText(text, x, y, width, height);
        }
        textState.x += rtl ? -width : width;
        textState.buffer = this.createTextBuffer(rtl);
        const outputWidth = Math.abs(textState.x - textState.startX);
        if (textState.outputWidth < outputWidth) {
            textState.outputWidth = outputWidth;
        }
        textState.outputHeight = y - textState.startY + height;
    }
    createTextBuffer(rtl) {
        // U+202B: RIGHT-TO-LEFT EMBEDDING
        return rtl ? "\u202B" : "";
    }
    convertEscapeCharacters(text) {
        /* eslint no-control-regex: 0 */
        text = text.replace(/\\/g, "\x1b");
        text = text.replace(/\x1b\x1b/g, "\\");
        while (text.match(/\x1bV\[(\d+)\]/gi)) {
            text = text.replace(/\x1bV\[(\d+)\]/gi, (_, p1) => $gameVariables.value(parseInt(p1))
            );
        }
        text = text.replace(/\x1bN\[(\d+)\]/gi, (_, p1) => this.actorName(parseInt(p1))
        );
        text = text.replace(/\x1bP\[(\d+)\]/gi, (_, p1) => this.partyMemberName(parseInt(p1))
        );
        text = text.replace(/\x1bG/gi, TextManager.currencyUnit);
        return text;
    }
    actorName(n) {
        const actor = n >= 1 ? $gameActors.actor(n) : null;
        return actor ? actor.name() : "";
    }
    partyMemberName(n) {
        const actor = n >= 1 ? $gameParty.members()[n - 1] : null;
        return actor ? actor.name() : "";
    }
    processCharacter(textState) {
        const c = textState.text[textState.index++];
        if (c.charCodeAt(0) < 0x20) {
            this.flushTextState(textState);
            this.processControlCharacter(textState, c);
        } else {
            textState.buffer += c;
        }
    }
    processControlCharacter(textState, c) {
        if (c === "\n") {
            this.processNewLine(textState);
        }
        if (c === "\x1b") {
            const code = this.obtainEscapeCode(textState);
            this.processEscapeCharacter(code, textState);
        }
    }
    processNewLine(textState) {
        textState.x = textState.startX;
        textState.y += textState.height;
        textState.height = this.calcTextHeight(textState);
    }
    obtainEscapeCode(textState) {
        const regExp = /^[$.|^!><{}\\]|^[A-Z]+/i;
        const arr = regExp.exec(textState.text.slice(textState.index));
        if (arr) {
            textState.index += arr[0].length;
            return arr[0].toUpperCase();
        } else {
            return "";
        }
    }
    obtainEscapeParam(textState) {
        const regExp = /^\[\d+\]/;
        const arr = regExp.exec(textState.text.slice(textState.index));
        if (arr) {
            textState.index += arr[0].length;
            return parseInt(arr[0].slice(1));
        } else {
            return "";
        }
    }
    processEscapeCharacter(code, textState) {
        switch (code) {
            case "C":
                this.processColorChange(this.obtainEscapeParam(textState));
                break;
            case "I":
                this.processDrawIcon(this.obtainEscapeParam(textState), textState);
                break;
            case "PX":
                textState.x = this.obtainEscapeParam(textState);
                break;
            case "PY":
                textState.y = this.obtainEscapeParam(textState);
                break;
            case "FS":
                this.contents.fontSize = this.obtainEscapeParam(textState);
                break;
            case "{":
                this.makeFontBigger();
                break;
            case "}":
                this.makeFontSmaller();
                break;
        }
    }
    processColorChange(colorIndex) {
        this.changeTextColor(ColorManager.textColor(colorIndex));
    }
    processDrawIcon(iconIndex, textState) {
        if (textState.drawing) {
            this.drawIcon(iconIndex, textState.x + 2, textState.y + 2);
        }
        textState.x += ImageManager.iconWidth + 4;
    }
    makeFontBigger() {
        if (this.contents.fontSize <= 96) {
            this.contents.fontSize += 12;
        }
    }
    makeFontSmaller() {
        if (this.contents.fontSize >= 24) {
            this.contents.fontSize -= 12;
        }
    }
    calcTextHeight(textState) {
        const lineSpacing = this.lineHeight() - $gameSystem.mainFontSize();
        const lastFontSize = this.contents.fontSize;
        const lines = textState.text.slice(textState.index).split("\n");
        const textHeight = this.maxFontSizeInLine(lines[0]) + lineSpacing;
        this.contents.fontSize = lastFontSize;
        return textHeight;
    }
    maxFontSizeInLine(line) {
        let maxFontSize = this.contents.fontSize;
        const regExp = /\x1b({|}|FS)(\[(\d+)])?/gi;
        for (; ;) {
            const array = regExp.exec(line);
            if (!array) {
                break;
            }
            const code = String(array[1]).toUpperCase();
            if (code === "{") {
                this.makeFontBigger();
            } else if (code === "}") {
                this.makeFontSmaller();
            } else if (code === "FS") {
                this.contents.fontSize = parseInt(array[3]);
            }
            if (this.contents.fontSize > maxFontSize) {
                maxFontSize = this.contents.fontSize;
            }
        }
        return maxFontSize;
    }
    drawIcon(iconIndex, x, y) {
        const bitmap = ImageManager.loadSystem("IconSet");
        const pw = ImageManager.iconWidth;
        const ph = ImageManager.iconHeight;
        const sx = (iconIndex % 16) * pw;
        const sy = Math.floor(iconIndex / 16) * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y);
    }
    // prettier-ignore
    drawFace(faceName, faceIndex, x, y, width, height) {
        width = width || ImageManager.faceWidth;
        height = height || ImageManager.faceHeight;
        const bitmap = ImageManager.loadFace(faceName);
        const pw = ImageManager.faceWidth;
        const ph = ImageManager.faceHeight;
        const sw = Math.min(width, pw);
        const sh = Math.min(height, ph);
        const dx = Math.floor(x + Math.max(width - pw, 0) / 2);
        const dy = Math.floor(y + Math.max(height - ph, 0) / 2);
        const sx = Math.floor((faceIndex % 4) * pw + (pw - sw) / 2);
        const sy = Math.floor(Math.floor(faceIndex / 4) * ph + (ph - sh) / 2);
        this.contents.blt(bitmap, sx, sy, sw, sh, dx, dy);
    }
    // prettier-ignore
    drawCharacter(characterName, characterIndex, x, y) {
        const bitmap = ImageManager.loadCharacter(characterName);
        const big = ImageManager.isBigCharacter(characterName);
        const pw = bitmap.width / (big ? 3 : 12);
        const ph = bitmap.height / (big ? 4 : 8);
        const n = big ? 0 : characterIndex;
        const sx = ((n % 4) * 3 + 1) * pw;
        const sy = Math.floor(n / 4) * 4 * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x - pw / 2, y - ph);
    }
    drawItemName(item, x, y, width) {
        if (item) {
            const iconY = y + (this.lineHeight() - ImageManager.iconHeight) / 2;
            const textMargin = ImageManager.iconWidth + 4;
            const itemWidth = Math.max(0, width - textMargin);
            this.resetTextColor();
            this.drawIcon(item.iconIndex, x, iconY);
            this.drawText(item.name, x + textMargin, y, itemWidth);
        }
    }
    drawCurrencyValue(value, unit, x, y, width) {
        const unitWidth = Math.min(80, this.textWidth(unit));
        this.resetTextColor();
        this.drawText(value, x, y, width - unitWidth - 6, "right");
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(unit, x + width - unitWidth, y, unitWidth, "right");
    }
    setBackgroundType(type) {
        if (type === 0) {
            this.opacity = 255;
        } else {
            this.opacity = 0;
        }
        if (type === 1) {
            this.showBackgroundDimmer();
        } else {
            this.hideBackgroundDimmer();
        }
    }
    showBackgroundDimmer() {
        if (!this._dimmerSprite) {
            this.createDimmerSprite();
        }
        const bitmap = this._dimmerSprite.bitmap;
        if (bitmap.width !== this.width || bitmap.height !== this.height) {
            this.refreshDimmerBitmap();
        }
        this._dimmerSprite.visible = true;
        this.updateBackgroundDimmer();
    }
    createDimmerSprite() {
        this._dimmerSprite = new Sprite();
        this._dimmerSprite.bitmap = new Bitmap(0, 0);
        this._dimmerSprite.x = -4;
        this.addChildToBack(this._dimmerSprite);
    }
    hideBackgroundDimmer() {
        if (this._dimmerSprite) {
            this._dimmerSprite.visible = false;
        }
    }
    updateBackgroundDimmer() {
        if (this._dimmerSprite) {
            this._dimmerSprite.opacity = this.openness;
        }
    }
    refreshDimmerBitmap() {
        if (this._dimmerSprite) {
            const bitmap = this._dimmerSprite.bitmap;
            const w = this.width > 0 ? this.width + 8 : 0;
            const h = this.height;
            const m = this.padding;
            const c1 = ColorManager.dimColor1();
            const c2 = ColorManager.dimColor2();
            bitmap.resize(w, h);
            bitmap.gradientFillRect(0, 0, w, m, c2, c1, true);
            bitmap.fillRect(0, m, w, h - m * 2, c1);
            bitmap.gradientFillRect(0, h - m, w, m, c1, c2, true);
            this._dimmerSprite.setFrame(0, 0, w, h);
        }
    }
    playCursorSound() {
        SoundManager.playCursor();
    }
    playOkSound() {
        SoundManager.playOk();
    }
    playBuzzerSound() {
        SoundManager.playBuzzer();
    }
}
//-----------------------------------------------------------------------------
// Window_Scrollable
//
// The window class with scroll functions.

class Window_Scrollable extends Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this._scrollX = 0;
        this._scrollY = 0;
        this._scrollBaseX = 0;
        this._scrollBaseY = 0;
        this.clearScrollStatus();
    }
    clearScrollStatus() {
        this._scrollTargetX = 0;
        this._scrollTargetY = 0;
        this._scrollDuration = 0;
        this._scrollAccelX = 0;
        this._scrollAccelY = 0;
        this._scrollTouching = false;
        this._scrollLastTouchX = 0;
        this._scrollLastTouchY = 0;
        this._scrollLastCursorVisible = false;
    }
    scrollX() {
        return this._scrollX;
    }
    scrollY() {
        return this._scrollY;
    }
    scrollBaseX() {
        return this._scrollBaseX;
    }
    scrollBaseY() {
        return this._scrollBaseY;
    }
    scrollTo(x, y) {
        const scrollX = x.clamp(0, this.maxScrollX());
        const scrollY = y.clamp(0, this.maxScrollY());
        if (this._scrollX !== scrollX || this._scrollY !== scrollY) {
            this._scrollX = scrollX;
            this._scrollY = scrollY;
            this.updateOrigin();
        }
    }
    scrollBy(x, y) {
        this.scrollTo(this._scrollX + x, this._scrollY + y);
    }
    smoothScrollTo(x, y) {
        this._scrollTargetX = x.clamp(0, this.maxScrollX());
        this._scrollTargetY = y.clamp(0, this.maxScrollY());
        this._scrollDuration = Input.keyRepeatInterval;
    }
    smoothScrollBy(x, y) {
        if (this._scrollDuration === 0) {
            this._scrollTargetX = this.scrollX();
            this._scrollTargetY = this.scrollY();
        }
        this.smoothScrollTo(this._scrollTargetX + x, this._scrollTargetY + y);
    }
    setScrollAccel(x, y) {
        this._scrollAccelX = x;
        this._scrollAccelY = y;
    }
    overallWidth() {
        return this.innerWidth;
    }
    overallHeight() {
        return this.innerHeight;
    }
    maxScrollX() {
        return Math.max(0, this.overallWidth() - this.innerWidth);
    }
    maxScrollY() {
        return Math.max(0, this.overallHeight() - this.innerHeight);
    }
    scrollBlockWidth() {
        return this.itemWidth();
    }
    scrollBlockHeight() {
        return this.itemHeight();
    }
    smoothScrollDown(n) {
        this.smoothScrollBy(0, this.itemHeight() * n);
    }
    smoothScrollUp(n) {
        this.smoothScrollBy(0, -this.itemHeight() * n);
    }
    update() {
        Window_Base.prototype.update.call(this);
        this.processWheelScroll();
        this.processTouchScroll();
        this.updateSmoothScroll();
        this.updateScrollAccel();
        this.updateArrows();
        this.updateOrigin();
    }
    processWheelScroll() {
        if (this.isWheelScrollEnabled() && this.isTouchedInsideFrame()) {
            const threshold = 20;
            if (TouchInput.wheelY >= threshold) {
                this.smoothScrollDown(1);
            }
            if (TouchInput.wheelY <= -threshold) {
                this.smoothScrollUp(1);
            }
        }
    }
    processTouchScroll() {
        if (this.isTouchScrollEnabled()) {
            if (TouchInput.isTriggered() && this.isTouchedInsideFrame()) {
                this.onTouchScrollStart();
            }
            if (this._scrollTouching) {
                if (TouchInput.isReleased()) {
                    this.onTouchScrollEnd();
                } else if (TouchInput.isMoved()) {
                    this.onTouchScroll();
                }
            }
        }
    }
    isWheelScrollEnabled() {
        return this.isScrollEnabled();
    }
    isTouchScrollEnabled() {
        return this.isScrollEnabled();
    }
    isScrollEnabled() {
        return true;
    }
    isTouchedInsideFrame() {
        const touchPos = new Point(TouchInput.x, TouchInput.y);
        const localPos = this.worldTransform.applyInverse(touchPos);
        return this.innerRect.contains(localPos.x, localPos.y);
    }
    onTouchScrollStart() {
        this._scrollTouching = true;
        this._scrollLastTouchX = TouchInput.x;
        this._scrollLastTouchY = TouchInput.y;
        this._scrollLastCursorVisible = this.cursorVisible;
        this.setScrollAccel(0, 0);
    }
    onTouchScroll() {
        const accelX = this._scrollLastTouchX - TouchInput.x;
        const accelY = this._scrollLastTouchY - TouchInput.y;
        this.setScrollAccel(accelX, accelY);
        this._scrollLastTouchX = TouchInput.x;
        this._scrollLastTouchY = TouchInput.y;
        this.cursorVisible = false;
    }
    onTouchScrollEnd() {
        this._scrollTouching = false;
        this.cursorVisible = this._scrollLastCursorVisible;
    }
    updateSmoothScroll() {
        if (this._scrollDuration > 0) {
            const d = this._scrollDuration;
            const deltaX = (this._scrollTargetX - this._scrollX) / d;
            const deltaY = (this._scrollTargetY - this._scrollY) / d;
            this.scrollBy(deltaX, deltaY);
            this._scrollDuration--;
        }
    }
    updateScrollAccel() {
        if (this._scrollAccelX !== 0 || this._scrollAccelY !== 0) {
            this.scrollBy(this._scrollAccelX, this._scrollAccelY);
            this._scrollAccelX *= 0.92;
            this._scrollAccelY *= 0.92;
            if (Math.abs(this._scrollAccelX) < 1) {
                this._scrollAccelX = 0;
            }
            if (Math.abs(this._scrollAccelY) < 1) {
                this._scrollAccelY = 0;
            }
        }
    }
    updateArrows() {
        this.downArrowVisible = this._scrollY < this.maxScrollY();
        this.upArrowVisible = this._scrollY > 0;
    }
    updateOrigin() {
        const blockWidth = this.scrollBlockWidth() || 1;
        const blockHeight = this.scrollBlockHeight() || 1;
        const baseX = this._scrollX - (this._scrollX % blockWidth);
        const baseY = this._scrollY - (this._scrollY % blockHeight);
        if (baseX !== this._scrollBaseX || baseY !== this._scrollBaseY) {
            this.updateScrollBase(baseX, baseY);
            this.paint();
        }
        this.origin.x = this._scrollX % blockWidth;
        this.origin.y = this._scrollY % blockHeight;
    }
    updateScrollBase(baseX, baseY) {
        const deltaX = baseX - this._scrollBaseX;
        const deltaY = baseY - this._scrollBaseY;
        this._scrollBaseX = baseX;
        this._scrollBaseY = baseY;
        this.moveCursorBy(-deltaX, -deltaY);
        this.moveInnerChildrenBy(-deltaX, -deltaY);
    }
    paint() {
        // to be overridden
    }
}
//-----------------------------------------------------------------------------
// Window_Selectable
//
// The window class with cursor movement functions.

class Window_Selectable extends Window_Scrollable {
    initialize(rect) {
        super.initialize(rect);
        this._index = -1;
        this._cursorFixed = false;
        this._cursorAll = false;
        this._helpWindow = null;
        this._handlers = {};
        this._doubleTouch = false;
        this._canRepeat = true;
        this.deactivate();
    }
    index() {
        return this._index;
    }
    cursorFixed() {
        return this._cursorFixed;
    }
    setCursorFixed(cursorFixed) {
        this._cursorFixed = cursorFixed;
    }
    cursorAll() {
        return this._cursorAll;
    }
    setCursorAll(cursorAll) {
        this._cursorAll = cursorAll;
    }
    maxCols() {
        return 1;
    }
    maxItems() {
        return 0;
    }
    colSpacing() {
        return 8;
    }
    rowSpacing() {
        return 4;
    }
    itemWidth() {
        return Math.floor(this.innerWidth / this.maxCols());
    }
    itemHeight() {
        return Window_Scrollable.prototype.itemHeight.call(this) + 8;
    }
    contentsHeight() {
        return this.innerHeight + this.itemHeight();
    }
    maxRows() {
        return Math.max(Math.ceil(this.maxItems() / this.maxCols()), 1);
    }
    overallHeight() {
        return this.maxRows() * this.itemHeight();
    }
    activate() {
        Window_Scrollable.prototype.activate.call(this);
        this.reselect();
    }
    deactivate() {
        Window_Scrollable.prototype.deactivate.call(this);
        this.reselect();
    }
    select(index) {
        this._index = index;
        this.refreshCursor();
        this.callUpdateHelp();
    }
    forceSelect(index) {
        this.select(index);
        this.ensureCursorVisible(false);
    }
    smoothSelect(index) {
        this.select(index);
        this.ensureCursorVisible(true);
    }
    deselect() {
        this.select(-1);
    }
    reselect() {
        this.select(this._index);
        this.ensureCursorVisible(true);
        this.cursorVisible = true;
    }
    row() {
        return Math.floor(this.index() / this.maxCols());
    }
    topRow() {
        return Math.floor(this.scrollY() / this.itemHeight());
    }
    maxTopRow() {
        return Math.max(0, this.maxRows() - this.maxPageRows());
    }
    setTopRow(row) {
        this.scrollTo(this.scrollX(), row * this.itemHeight());
    }
    maxPageRows() {
        return Math.floor(this.innerHeight / this.itemHeight());
    }
    maxPageItems() {
        return this.maxPageRows() * this.maxCols();
    }
    maxVisibleItems() {
        const visibleRows = Math.ceil(this.contentsHeight() / this.itemHeight());
        return visibleRows * this.maxCols();
    }
    isHorizontal() {
        return this.maxPageRows() === 1;
    }
    topIndex() {
        return this.topRow() * this.maxCols();
    }
    itemRect(index) {
        const maxCols = this.maxCols();
        const itemWidth = this.itemWidth();
        const itemHeight = this.itemHeight();
        const colSpacing = this.colSpacing();
        const rowSpacing = this.rowSpacing();
        const col = index % maxCols;
        const row = Math.floor(index / maxCols);
        const x = col * itemWidth + colSpacing / 2 - this.scrollBaseX();
        const y = row * itemHeight + rowSpacing / 2 - this.scrollBaseY();
        const width = itemWidth - colSpacing;
        const height = itemHeight - rowSpacing;
        return new Rectangle(x, y, width, height);
    }
    itemRectWithPadding(index) {
        const rect = this.itemRect(index);
        const padding = this.itemPadding();
        rect.x += padding;
        rect.width -= padding * 2;
        return rect;
    }
    itemLineRect(index) {
        const rect = this.itemRectWithPadding(index);
        const padding = (rect.height - this.lineHeight()) / 2;
        rect.y += padding;
        rect.height -= padding * 2;
        return rect;
    }
    setHelpWindow(helpWindow) {
        this._helpWindow = helpWindow;
        this.callUpdateHelp();
    }
    showHelpWindow() {
        if (this._helpWindow) {
            this._helpWindow.show();
        }
    }
    hideHelpWindow() {
        if (this._helpWindow) {
            this._helpWindow.hide();
        }
    }
    setHandler(symbol, method) {
        this._handlers[symbol] = method;
    }
    isHandled(symbol) {
        return !!this._handlers[symbol];
    }
    callHandler(symbol) {
        if (this.isHandled(symbol)) {
            this._handlers[symbol]();
        }
    }
    isOpenAndActive() {
        return this.isOpen() && this.visible && this.active;
    }
    isCursorMovable() {
        return (
            this.isOpenAndActive() &&
            !this._cursorFixed &&
            !this._cursorAll &&
            this.maxItems() > 0
        );
    }
    cursorDown(wrap) {
        const index = this.index();
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        if (index < maxItems - maxCols || (wrap && maxCols === 1)) {
            this.smoothSelect((index + maxCols) % maxItems);
        }
    }
    cursorUp(wrap) {
        const index = Math.max(0, this.index());
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        if (index >= maxCols || (wrap && maxCols === 1)) {
            this.smoothSelect((index - maxCols + maxItems) % maxItems);
        }
    }
    cursorRight(wrap) {
        const index = this.index();
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        const horizontal = this.isHorizontal();
        if (maxCols >= 2 && (index < maxItems - 1 || (wrap && horizontal))) {
            this.smoothSelect((index + 1) % maxItems);
        }
    }
    cursorLeft(wrap) {
        const index = Math.max(0, this.index());
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        const horizontal = this.isHorizontal();
        if (maxCols >= 2 && (index > 0 || (wrap && horizontal))) {
            this.smoothSelect((index - 1 + maxItems) % maxItems);
        }
    }
    cursorPagedown() {
        const index = this.index();
        const maxItems = this.maxItems();
        if (this.topRow() + this.maxPageRows() < this.maxRows()) {
            this.smoothScrollDown(this.maxPageRows());
            this.select(Math.min(index + this.maxPageItems(), maxItems - 1));
        }
    }
    cursorPageup() {
        const index = this.index();
        if (this.topRow() > 0) {
            this.smoothScrollUp(this.maxPageRows());
            this.select(Math.max(index - this.maxPageItems(), 0));
        }
    }
    isScrollEnabled() {
        return this.active || this.index() < 0;
    }
    update() {
        this.processCursorMove();
        this.processHandling();
        this.processTouch();
        Window_Scrollable.prototype.update.call(this);
    }
    processCursorMove() {
        if (this.isCursorMovable()) {
            const lastIndex = this.index();
            if (Input.isRepeated("down")) {
                this.cursorDown(Input.isTriggered("down"));
            }
            if (Input.isRepeated("up")) {
                this.cursorUp(Input.isTriggered("up"));
            }
            if (Input.isRepeated("right")) {
                this.cursorRight(Input.isTriggered("right"));
            }
            if (Input.isRepeated("left")) {
                this.cursorLeft(Input.isTriggered("left"));
            }
            if (!this.isHandled("pagedown") && Input.isTriggered("pagedown")) {
                this.cursorPagedown();
            }
            if (!this.isHandled("pageup") && Input.isTriggered("pageup")) {
                this.cursorPageup();
            }
            if (this.index() !== lastIndex) {
                this.playCursorSound();
            }
        }
    }
    processHandling() {
        if (this.isOpenAndActive()) {
            if (this.isOkEnabled() && this.isOkTriggered()) {
                return this.processOk();
            }
            if (this.isCancelEnabled() && this.isCancelTriggered()) {
                return this.processCancel();
            }
            if (this.isHandled("pagedown") && Input.isTriggered("pagedown")) {
                return this.processPagedown();
            }
            if (this.isHandled("pageup") && Input.isTriggered("pageup")) {
                return this.processPageup();
            }
        }
    }
    processTouch() {
        if (this.isOpenAndActive()) {
            if (this.isHoverEnabled() && TouchInput.isHovered()) {
                this.onTouchSelect(false);
            } else if (TouchInput.isTriggered()) {
                this.onTouchSelect(true);
            }
            if (TouchInput.isClicked()) {
                this.onTouchOk();
            } else if (TouchInput.isCancelled()) {
                this.onTouchCancel();
            }
        }
    }
    isHoverEnabled() {
        return true;
    }
    onTouchSelect(trigger) {
        this._doubleTouch = false;
        if (this.isCursorMovable()) {
            const lastIndex = this.index();
            const hitIndex = this.hitIndex();
            if (hitIndex >= 0) {
                if (hitIndex === this.index()) {
                    this._doubleTouch = true;
                }
                this.select(hitIndex);
            }
            if (trigger && this.index() !== lastIndex) {
                this.playCursorSound();
            }
        }
    }
    onTouchOk() {
        if (this.isTouchOkEnabled()) {
            const hitIndex = this.hitIndex();
            if (this._cursorFixed) {
                if (hitIndex === this.index()) {
                    this.processOk();
                }
            } else if (hitIndex >= 0) {
                this.processOk();
            }
        }
    }
    onTouchCancel() {
        if (this.isCancelEnabled()) {
            this.processCancel();
        }
    }
    hitIndex() {
        const touchPos = new Point(TouchInput.x, TouchInput.y);
        const localPos = this.worldTransform.applyInverse(touchPos);
        return this.hitTest(localPos.x, localPos.y);
    }
    hitTest(x, y) {
        if (this.innerRect.contains(x, y)) {
            const cx = this.origin.x + x - this.padding;
            const cy = this.origin.y + y - this.padding;
            const topIndex = this.topIndex();
            for (let i = 0; i < this.maxVisibleItems(); i++) {
                const index = topIndex + i;
                if (index < this.maxItems()) {
                    const rect = this.itemRect(index);
                    if (rect.contains(cx, cy)) {
                        return index;
                    }
                }
            }
        }
        return -1;
    }
    isTouchOkEnabled() {
        return (
            this.isOkEnabled() &&
            (this._cursorFixed || this._cursorAll || this._doubleTouch)
        );
    }
    isOkEnabled() {
        return this.isHandled("ok");
    }
    isCancelEnabled() {
        return this.isHandled("cancel");
    }
    isOkTriggered() {
        return this._canRepeat ? Input.isRepeated("ok") : Input.isTriggered("ok");
    }
    isCancelTriggered() {
        return Input.isRepeated("cancel");
    }
    processOk() {
        if (this.isCurrentItemEnabled()) {
            this.playOkSound();
            this.updateInputData();
            this.deactivate();
            this.callOkHandler();
        } else {
            this.playBuzzerSound();
        }
    }
    callOkHandler() {
        this.callHandler("ok");
    }
    processCancel() {
        SoundManager.playCancel();
        this.updateInputData();
        this.deactivate();
        this.callCancelHandler();
    }
    callCancelHandler() {
        this.callHandler("cancel");
    }
    processPageup() {
        this.updateInputData();
        this.deactivate();
        this.callHandler("pageup");
    }
    processPagedown() {
        this.updateInputData();
        this.deactivate();
        this.callHandler("pagedown");
    }
    updateInputData() {
        Input.update();
        TouchInput.update();
        this.clearScrollStatus();
    }
    ensureCursorVisible(smooth) {
        if (this._cursorAll) {
            this.scrollTo(0, 0);
        } else if (this.innerHeight > 0 && this.row() >= 0) {
            const scrollY = this.scrollY();
            const itemTop = this.row() * this.itemHeight();
            const itemBottom = itemTop + this.itemHeight();
            const scrollMin = itemBottom - this.innerHeight;
            if (scrollY > itemTop) {
                if (smooth) {
                    this.smoothScrollTo(0, itemTop);
                } else {
                    this.scrollTo(0, itemTop);
                }
            } else if (scrollY < scrollMin) {
                if (smooth) {
                    this.smoothScrollTo(0, scrollMin);
                } else {
                    this.scrollTo(0, scrollMin);
                }
            }
        }
    }
    callUpdateHelp() {
        if (this.active && this._helpWindow) {
            this.updateHelp();
        }
    }
    updateHelp() {
        this._helpWindow.clear();
    }
    setHelpWindowItem(item) {
        if (this._helpWindow) {
            this._helpWindow.setItem(item);
        }
    }
    isCurrentItemEnabled() {
        return true;
    }
    drawAllItems() {
        const topIndex = this.topIndex();
        for (let i = 0; i < this.maxVisibleItems(); i++) {
            const index = topIndex + i;
            if (index < this.maxItems()) {
                this.drawItemBackground(index);
                this.drawItem(index);
            }
        }
    }
    drawItem( /*index*/) {
        //
    }
    clearItem(index) {
        const rect = this.itemRect(index);
        this.contents.clearRect(rect.x, rect.y, rect.width, rect.height);
        this.contentsBack.clearRect(rect.x, rect.y, rect.width, rect.height);
    }
    drawItemBackground(index) {
        const rect = this.itemRect(index);
        this.drawBackgroundRect(rect);
    }
    drawBackgroundRect(rect) {
        const c1 = ColorManager.itemBackColor1();
        const c2 = ColorManager.itemBackColor2();
        const x = rect.x;
        const y = rect.y;
        const w = rect.width;
        const h = rect.height;
        this.contentsBack.gradientFillRect(x, y, w, h, c1, c2, true);
        this.contentsBack.strokeRect(x, y, w, h, c1);
    }
    redrawItem(index) {
        if (index >= 0) {
            this.clearItem(index);
            this.drawItemBackground(index);
            this.drawItem(index);
        }
    }
    redrawCurrentItem() {
        this.redrawItem(this.index());
    }
    refresh() {
        this.paint();
    }
    paint() {
        if (this.contents) {
            this.contents.clear();
            this.contentsBack.clear();
            this.drawAllItems();
        }
    }
    refreshCursor() {
        if (this._cursorAll) {
            this.refreshCursorForAll();
        } else if (this.index() >= 0) {
            const rect = this.itemRect(this.index());
            this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            this.setCursorRect(0, 0, 0, 0);
        }
    }
    refreshCursorForAll() {
        const maxItems = this.maxItems();
        if (maxItems > 0) {
            const rect = this.itemRect(0);
            rect.enlarge(this.itemRect(maxItems - 1));
            this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            this.setCursorRect(0, 0, 0, 0);
        }
    }
}
//-----------------------------------------------------------------------------
// Window_Command
//
// The superclass of windows for selecting a command.

class Window_Command extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this.refresh();
        this.select(0);
        this.activate();
    }
    maxItems() {
        return this._list.length;
    }
    clearCommandList() {
        this._list = [];
    }
    makeCommandList() {
        //
    }
    // prettier-ignore
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name: name, symbol: symbol, enabled: enabled, ext: ext });
    }
    commandName(index) {
        return this._list[index].name;
    }
    commandSymbol(index) {
        return this._list[index].symbol;
    }
    isCommandEnabled(index) {
        return this._list[index].enabled;
    }
    currentData() {
        return this.index() >= 0 ? this._list[this.index()] : null;
    }
    isCurrentItemEnabled() {
        return this.currentData() ? this.currentData().enabled : false;
    }
    currentSymbol() {
        return this.currentData() ? this.currentData().symbol : null;
    }
    currentExt() {
        return this.currentData() ? this.currentData().ext : null;
    }
    findSymbol(symbol) {
        return this._list.findIndex(item => item.symbol === symbol);
    }
    selectSymbol(symbol) {
        const index = this.findSymbol(symbol);
        if (index >= 0) {
            this.forceSelect(index);
        } else {
            this.forceSelect(0);
        }
    }
    findExt(ext) {
        return this._list.findIndex(item => item.ext === ext);
    }
    selectExt(ext) {
        const index = this.findExt(ext);
        if (index >= 0) {
            this.forceSelect(index);
        } else {
            this.forceSelect(0);
        }
    }
    drawItem(index) {
        const rect = this.itemLineRect(index);
        const align = this.itemTextAlign();
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align);
    }
    itemTextAlign() {
        return "center";
    }
    isOkEnabled() {
        return true;
    }
    callOkHandler() {
        const symbol = this.currentSymbol();
        if (this.isHandled(symbol)) {
            this.callHandler(symbol);
        } else if (this.isHandled("ok")) {
            Window_Selectable.prototype.callOkHandler.call(this);
        } else {
            this.activate();
        }
    }
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
        Window_Selectable.prototype.refresh.call(this);
    }
}
//-----------------------------------------------------------------------------
// Window_HorzCommand
//
// The command window for the horizontal selection format.

class Window_HorzCommand extends Window_Command {
    maxCols() {
        return 4;
    }
    itemTextAlign() {
        return "center";
    }
}
//-----------------------------------------------------------------------------
// Window_Help
//
// The window for displaying the description of the selected item.

class Window_Help extends Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this._text = "";
    }
    setText(text) {
        if (this._text !== text) {
            this._text = text;
            this.refresh();
        }
    }
    clear() {
        this.setText("");
    }
    setItem(item) {
        this.setText(item ? item.description : "");
    }
    refresh() {
        const rect = this.baseTextRect();
        this.contents.clear();
        this.drawTextEx(this._text, rect.x, rect.y, rect.width);
    }
}
//-----------------------------------------------------------------------------
// Window_Gold
//
// The window for displaying the party's gold.

class Window_Gold extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this.refresh();
    }
    colSpacing() {
        return 0;
    }
    refresh() {
        const rect = this.itemLineRect(0);
        const x = rect.x;
        const y = rect.y;
        const width = rect.width;
        this.contents.clear();
        this.drawCurrencyValue(this.value(), this.currencyUnit(), x, y, width);
    }
    value() {
        return $gameParty.gold();
    }
    currencyUnit() {
        return TextManager.currencyUnit;
    }
    open() {
        this.refresh();
        Window_Selectable.prototype.open.call(this);
    }
}
//-----------------------------------------------------------------------------
// Window_StatusBase
//
// The superclass of windows for displaying actor status.

class Window_StatusBase extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._additionalSprites = {};
        this.loadFaceImages();
    }
    loadFaceImages() {
        for (const actor of $gameParty.members()) {
            ImageManager.loadFace(actor.faceName());
        }
    }
    refresh() {
        this.hideAdditionalSprites();
        Window_Selectable.prototype.refresh.call(this);
    }
    hideAdditionalSprites() {
        for (const sprite of Object.values(this._additionalSprites)) {
            sprite.hide();
        }
    }
    placeActorName(actor, x, y) {
        const key = "actor%1-name".format(actor.actorId());
        const sprite = this.createInnerSprite(key, Sprite_Name);
        sprite.setup(actor);
        sprite.move(x, y);
        sprite.show();
    }
    placeStateIcon(actor, x, y) {
        const key = "actor%1-stateIcon".format(actor.actorId());
        const sprite = this.createInnerSprite(key, Sprite_StateIcon);
        sprite.setup(actor);
        sprite.move(x, y);
        sprite.show();
    }
    placeGauge(actor, type, x, y) {
        const key = "actor%1-gauge-%2".format(actor.actorId(), type);
        const sprite = this.createInnerSprite(key, Sprite_Gauge);
        sprite.setup(actor, type);
        sprite.move(x, y);
        sprite.show();
    }
    createInnerSprite(key, spriteClass) {
        const dict = this._additionalSprites;
        if (dict[key]) {
            return dict[key];
        } else {
            const sprite = new spriteClass();
            dict[key] = sprite;
            this.addInnerChild(sprite);
            return sprite;
        }
    }
    placeTimeGauge(actor, x, y) {
        if (BattleManager.isTpb()) {
            this.placeGauge(actor, "time", x, y);
        }
    }
    placeBasicGauges(actor, x, y) {
        this.placeGauge(actor, "hp", x, y);
        this.placeGauge(actor, "mp", x, y + this.gaugeLineHeight());
        if ($dataSystem.optDisplayTp) {
            this.placeGauge(actor, "tp", x, y + this.gaugeLineHeight() * 2);
        }
    }
    gaugeLineHeight() {
        return 24;
    }
    drawActorCharacter(actor, x, y) {
        this.drawCharacter(actor.characterName(), actor.characterIndex(), x, y);
    }
    // prettier-ignore
    drawActorFace(actor, x, y, width, height) {
        this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
    }
    drawActorName(actor, x, y, width) {
        width = width || 168;
        this.changeTextColor(ColorManager.hpColor(actor));
        this.drawText(actor.name(), x, y, width);
    }
    drawActorClass(actor, x, y, width) {
        width = width || 168;
        this.resetTextColor();
        this.drawText(actor.currentClass().name, x, y, width);
    }
    drawActorNickname(actor, x, y, width) {
        width = width || 270;
        this.resetTextColor();
        this.drawText(actor.nickname(), x, y, width);
    }
    drawActorLevel(actor, x, y) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(TextManager.levelA, x, y, 48);
        this.resetTextColor();
        this.drawText(actor.level, x + 84, y, 36, "right");
    }
    drawActorIcons(actor, x, y, width) {
        width = width || 144;
        const iconWidth = ImageManager.iconWidth;
        const icons = actor.allIcons().slice(0, Math.floor(width / iconWidth));
        let iconX = x;
        for (const icon of icons) {
            this.drawIcon(icon, iconX, y + 2);
            iconX += iconWidth;
        }
    }
    drawActorSimpleStatus(actor, x, y) {
        const lineHeight = this.lineHeight();
        const x2 = x + 180;
        this.drawActorName(actor, x, y);
        this.drawActorLevel(actor, x, y + lineHeight * 1);
        this.drawActorIcons(actor, x, y + lineHeight * 2);
        this.drawActorClass(actor, x2, y);
        this.placeBasicGauges(actor, x2, y + lineHeight);
    }
    actorSlotName(actor, index) {
        const slots = actor.equipSlots();
        return $dataSystem.equipTypes[slots[index]];
    }
}
//-----------------------------------------------------------------------------
// Window_MenuCommand
//
// The window for selecting a command on the menu screen.

class Window_MenuCommand extends Window_Command {
    static initCommandPosition() {
        this._lastCommandSymbol = null;
    }
    initialize(rect) {
        super.initialize(rect);
        this.selectLast();
        this._canRepeat = false;
    }
    makeCommandList() {
        this.addMainCommands();
        this.addFormationCommand();
        this.addOriginalCommands();
        this.addOptionsCommand();
        this.addSaveCommand();
        this.addGameEndCommand();
    }
    addMainCommands() {
        const enabled = this.areMainCommandsEnabled();
        if (this.needsCommand("item")) {
            this.addCommand(TextManager.item, "item", enabled);
        }
        if (this.needsCommand("skill")) {
            this.addCommand(TextManager.skill, "skill", enabled);
        }
        if (this.needsCommand("equip")) {
            this.addCommand(TextManager.equip, "equip", enabled);
        }
        if (this.needsCommand("status")) {
            this.addCommand(TextManager.status, "status", enabled);
        }
    }
    addFormationCommand() {
        if (this.needsCommand("formation")) {
            const enabled = this.isFormationEnabled();
            this.addCommand(TextManager.formation, "formation", enabled);
        }
    }
    addOriginalCommands() {
        //
    }
    addOptionsCommand() {
        if (this.needsCommand("options")) {
            const enabled = this.isOptionsEnabled();
            this.addCommand(TextManager.options, "options", enabled);
        }
    }
    addSaveCommand() {
        if (this.needsCommand("save")) {
            const enabled = this.isSaveEnabled();
            this.addCommand(TextManager.save, "save", enabled);
        }
    }
    addGameEndCommand() {
        const enabled = this.isGameEndEnabled();
        this.addCommand(TextManager.gameEnd, "gameEnd", enabled);
    }
    needsCommand(name) {
        const table = ["item", "skill", "equip", "status", "formation", "save"];
        const index = table.indexOf(name);
        if (index >= 0) {
            return $dataSystem.menuCommands[index];
        }
        return true;
    }
    areMainCommandsEnabled() {
        return $gameParty.exists();
    }
    isFormationEnabled() {
        return $gameParty.size() >= 2 && $gameSystem.isFormationEnabled();
    }
    isOptionsEnabled() {
        return true;
    }
    isSaveEnabled() {
        return !DataManager.isEventTest() && $gameSystem.isSaveEnabled();
    }
    isGameEndEnabled() {
        return true;
    }
    processOk() {
        Window_MenuCommand._lastCommandSymbol = this.currentSymbol();
        Window_Command.prototype.processOk.call(this);
    }
    selectLast() {
        this.selectSymbol(Window_MenuCommand._lastCommandSymbol);
    }
}
//-----------------------------------------------------------------------------
// Window_MenuStatus
//
// The window for displaying party member status on the menu screen.

class Window_MenuStatus extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._formationMode = false;
        this._pendingIndex = -1;
        this.refresh();
    }
    maxItems() {
        return $gameParty.size();
    }
    numVisibleRows() {
        return 4;
    }
    itemHeight() {
        return Math.floor(this.innerHeight / this.numVisibleRows());
    }
    actor(index) {
        return $gameParty.members()[index];
    }
    drawItem(index) {
        this.drawPendingItemBackground(index);
        this.drawItemImage(index);
        this.drawItemStatus(index);
    }
    drawPendingItemBackground(index) {
        if (index === this._pendingIndex) {
            const rect = this.itemRect(index);
            const color = ColorManager.pendingColor();
            this.changePaintOpacity(false);
            this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, color);
            this.changePaintOpacity(true);
        }
    }
    drawItemImage(index) {
        const actor = this.actor(index);
        const rect = this.itemRect(index);
        const width = ImageManager.faceWidth;
        const height = rect.height - 2;
        this.changePaintOpacity(actor.isBattleMember());
        this.drawActorFace(actor, rect.x + 1, rect.y + 1, width, height);
        this.changePaintOpacity(true);
    }
    drawItemStatus(index) {
        const actor = this.actor(index);
        const rect = this.itemRect(index);
        const x = rect.x + 180;
        const y = rect.y + Math.floor(rect.height / 2 - this.lineHeight() * 1.5);
        this.drawActorSimpleStatus(actor, x, y);
    }
    processOk() {
        Window_StatusBase.prototype.processOk.call(this);
        const actor = this.actor(this.index());
        $gameParty.setMenuActor(actor);
    }
    isCurrentItemEnabled() {
        if (this._formationMode) {
            const actor = this.actor(this.index());
            return actor && actor.isFormationChangeOk();
        } else {
            return true;
        }
    }
    selectLast() {
        this.smoothSelect($gameParty.menuActor().index() || 0);
    }
    formationMode() {
        return this._formationMode;
    }
    setFormationMode(formationMode) {
        this._formationMode = formationMode;
    }
    pendingIndex() {
        return this._pendingIndex;
    }
    setPendingIndex(index) {
        const lastPendingIndex = this._pendingIndex;
        this._pendingIndex = index;
        this.redrawItem(this._pendingIndex);
        this.redrawItem(lastPendingIndex);
    }
}
//-----------------------------------------------------------------------------
// Window_MenuActor
//
// The window for selecting a target actor on the item and skill screens.

class Window_MenuActor extends Window_MenuStatus {
    initialize(rect) {
        super.initialize(rect);
        this.hide();
    }
    processOk() {
        if (!this.cursorAll()) {
            $gameParty.setTargetActor($gameParty.members()[this.index()]);
        }
        this.callOkHandler();
    }
    selectLast() {
        this.forceSelect($gameParty.targetActor().index() || 0);
    }
    selectForItem(item) {
        const actor = $gameParty.menuActor();
        const action = new Game_Action(actor);
        action.setItemObject(item);
        this.setCursorFixed(false);
        this.setCursorAll(false);
        if (action.isForUser()) {
            if (DataManager.isSkill(item)) {
                this.setCursorFixed(true);
                this.forceSelect(actor.index());
            } else {
                this.selectLast();
            }
        } else if (action.isForAll()) {
            this.setCursorAll(true);
            this.forceSelect(0);
        } else {
            this.selectLast();
        }
    }
}
//-----------------------------------------------------------------------------
// Window_ItemCategory
//
// The window for selecting a category of items on the item and shop screens.

class Window_ItemCategory extends Window_HorzCommand {
    maxCols() {
        return 4;
    }
    update() {
        Window_HorzCommand.prototype.update.call(this);
        if (this._itemWindow) {
            this._itemWindow.setCategory(this.currentSymbol());
        }
    }
    makeCommandList() {
        if (this.needsCommand("item")) {
            this.addCommand(TextManager.item, "item");
        }
        if (this.needsCommand("weapon")) {
            this.addCommand(TextManager.weapon, "weapon");
        }
        if (this.needsCommand("armor")) {
            this.addCommand(TextManager.armor, "armor");
        }
        if (this.needsCommand("keyItem")) {
            this.addCommand(TextManager.keyItem, "keyItem");
        }
    }
    needsCommand(name) {
        const table = ["item", "weapon", "armor", "keyItem"];
        const index = table.indexOf(name);
        if (index >= 0) {
            return $dataSystem.itemCategories[index];
        }
        return true;
    }
    setItemWindow(itemWindow) {
        this._itemWindow = itemWindow;
    }
    needsSelection() {
        return this.maxItems() >= 2;
    }
}
//-----------------------------------------------------------------------------
// Window_ItemList
//
// The window for selecting an item on the item screen.

class Window_ItemList extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._category = "none";
        this._data = [];
    }
    setCategory(category) {
        if (this._category !== category) {
            this._category = category;
            this.refresh();
            this.scrollTo(0, 0);
        }
    }
    maxCols() {
        return 2;
    }
    colSpacing() {
        return 16;
    }
    maxItems() {
        return this._data ? this._data.length : 1;
    }
    item() {
        return this.itemAt(this.index());
    }
    itemAt(index) {
        return this._data && index >= 0 ? this._data[index] : null;
    }
    isCurrentItemEnabled() {
        return this.isEnabled(this.item());
    }
    includes(item) {
        switch (this._category) {
            case "item":
                return DataManager.isItem(item) && item.itypeId === 1;
            case "weapon":
                return DataManager.isWeapon(item);
            case "armor":
                return DataManager.isArmor(item);
            case "keyItem":
                return DataManager.isItem(item) && item.itypeId === 2;
            default:
                return false;
        }
    }
    needsNumber() {
        if (this._category === "keyItem") {
            return $dataSystem.optKeyItemsNumber;
        } else {
            return true;
        }
    }
    isEnabled(item) {
        return $gameParty.canUse(item);
    }
    makeItemList() {
        this._data = $gameParty.allItems().filter(item => this.includes(item));
        if (this.includes(null)) {
            this._data.push(null);
        }
    }
    selectLast() {
        const index = this._data.indexOf($gameParty.lastItem());
        this.forceSelect(index >= 0 ? index : 0);
    }
    drawItem(index) {
        const item = this.itemAt(index);
        if (item) {
            const numberWidth = this.numberWidth();
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isEnabled(item));
            this.drawItemName(item, rect.x, rect.y, rect.width - numberWidth);
            this.drawItemNumber(item, rect.x, rect.y, rect.width);
            this.changePaintOpacity(1);
        }
    }
    numberWidth() {
        return this.textWidth("000");
    }
    drawItemNumber(item, x, y, width) {
        if (this.needsNumber()) {
            this.drawText(":", x, y, width - this.textWidth("00"), "right");
            this.drawText($gameParty.numItems(item), x, y, width, "right");
        }
    }
    updateHelp() {
        this.setHelpWindowItem(this.item());
    }
    refresh() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    }
}
//-----------------------------------------------------------------------------
// Window_SkillType
//
// The window for selecting a skill type on the skill screen.

class Window_SkillType extends Window_Command {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
            this.selectLast();
        }
    }
    makeCommandList() {
        if (this._actor) {
            const skillTypes = this._actor.skillTypes();
            for (const stypeId of skillTypes) {
                const name = $dataSystem.skillTypes[stypeId];
                this.addCommand(name, "skill", true, stypeId);
            }
        }
    }
    update() {
        Window_Command.prototype.update.call(this);
        if (this._skillWindow) {
            this._skillWindow.setStypeId(this.currentExt());
        }
    }
    setSkillWindow(skillWindow) {
        this._skillWindow = skillWindow;
    }
    selectLast() {
        const skill = this._actor.lastMenuSkill();
        if (skill) {
            this.selectExt(skill.stypeId);
        } else {
            this.forceSelect(0);
        }
    }
}
//-----------------------------------------------------------------------------
// Window_SkillStatus
//
// The window for displaying the skill user's status on the skill screen.

class Window_SkillStatus extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    }
    refresh() {
        Window_StatusBase.prototype.refresh.call(this);
        if (this._actor) {
            const x = this.colSpacing() / 2;
            const h = this.innerHeight;
            const y = h / 2 - this.lineHeight() * 1.5;
            this.drawActorFace(this._actor, x + 1, 0, 144, h);
            this.drawActorSimpleStatus(this._actor, x + 180, y);
        }
    }
}
//-----------------------------------------------------------------------------
// Window_SkillList
//
// The window for selecting a skill on the skill screen.

class Window_SkillList extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
        this._stypeId = 0;
        this._data = [];
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
            this.scrollTo(0, 0);
        }
    }
    setStypeId(stypeId) {
        if (this._stypeId !== stypeId) {
            this._stypeId = stypeId;
            this.refresh();
            this.scrollTo(0, 0);
        }
    }
    maxCols() {
        return 2;
    }
    colSpacing() {
        return 16;
    }
    maxItems() {
        return this._data ? this._data.length : 1;
    }
    item() {
        return this.itemAt(this.index());
    }
    itemAt(index) {
        return this._data && index >= 0 ? this._data[index] : null;
    }
    isCurrentItemEnabled() {
        return this.isEnabled(this._data[this.index()]);
    }
    includes(item) {
        return item && item.stypeId === this._stypeId;
    }
    isEnabled(item) {
        return this._actor && this._actor.canUse(item);
    }
    makeItemList() {
        if (this._actor) {
            this._data = this._actor.skills().filter(item => this.includes(item));
        } else {
            this._data = [];
        }
    }
    selectLast() {
        const index = this._data.indexOf(this._actor.lastSkill());
        this.forceSelect(index >= 0 ? index : 0);
    }
    drawItem(index) {
        const skill = this.itemAt(index);
        if (skill) {
            const costWidth = this.costWidth();
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isEnabled(skill));
            this.drawItemName(skill, rect.x, rect.y, rect.width - costWidth);
            this.drawSkillCost(skill, rect.x, rect.y, rect.width);
            this.changePaintOpacity(1);
        }
    }
    costWidth() {
        return this.textWidth("000");
    }
    drawSkillCost(skill, x, y, width) {
        if (this._actor.skillTpCost(skill) > 0) {
            this.changeTextColor(ColorManager.tpCostColor());
            this.drawText(this._actor.skillTpCost(skill), x, y, width, "right");
        } else if (this._actor.skillMpCost(skill) > 0) {
            this.changeTextColor(ColorManager.mpCostColor());
            this.drawText(this._actor.skillMpCost(skill), x, y, width, "right");
        }
    }
    updateHelp() {
        this.setHelpWindowItem(this.item());
    }
    refresh() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    }
}
//-----------------------------------------------------------------------------
// Window_EquipStatus
//
// The window for displaying parameter changes on the equipment screen.

class Window_EquipStatus extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
        this._tempActor = null;
        this.refresh();
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    }
    colSpacing() {
        return 0;
    }
    refresh() {
        this.contents.clear();
        if (this._actor) {
            const nameRect = this.itemLineRect(0);
            this.drawActorName(this._actor, nameRect.x, 0, nameRect.width);
            this.drawActorFace(this._actor, nameRect.x, nameRect.height);
            this.drawAllParams();
        }
    }
    setTempActor(tempActor) {
        if (this._tempActor !== tempActor) {
            this._tempActor = tempActor;
            this.refresh();
        }
    }
    drawAllParams() {
        for (let i = 0; i < 6; i++) {
            const x = this.itemPadding();
            const y = this.paramY(i);
            this.drawItem(x, y, 2 + i);
        }
    }
    drawItem(x, y, paramId) {
        const paramX = this.paramX();
        const paramWidth = this.paramWidth();
        const rightArrowWidth = this.rightArrowWidth();
        this.drawParamName(x, y, paramId);
        if (this._actor) {
            this.drawCurrentParam(paramX, y, paramId);
        }
        this.drawRightArrow(paramX + paramWidth, y);
        if (this._tempActor) {
            this.drawNewParam(paramX + paramWidth + rightArrowWidth, y, paramId);
        }
    }
    drawParamName(x, y, paramId) {
        const width = this.paramX() - this.itemPadding() * 2;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(TextManager.param(paramId), x, y, width);
    }
    drawCurrentParam(x, y, paramId) {
        const paramWidth = this.paramWidth();
        this.resetTextColor();
        this.drawText(this._actor.param(paramId), x, y, paramWidth, "right");
    }
    drawRightArrow(x, y) {
        const rightArrowWidth = this.rightArrowWidth();
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("\u2192", x, y, rightArrowWidth, "center");
    }
    drawNewParam(x, y, paramId) {
        const paramWidth = this.paramWidth();
        const newValue = this._tempActor.param(paramId);
        const diffvalue = newValue - this._actor.param(paramId);
        this.changeTextColor(ColorManager.paramchangeTextColor(diffvalue));
        this.drawText(newValue, x, y, paramWidth, "right");
    }
    rightArrowWidth() {
        return 32;
    }
    paramWidth() {
        return 48;
    }
    paramX() {
        const itemPadding = this.itemPadding();
        const rightArrowWidth = this.rightArrowWidth();
        const paramWidth = this.paramWidth();
        return this.innerWidth - itemPadding - paramWidth * 2 - rightArrowWidth;
    }
    paramY(index) {
        const faceHeight = ImageManager.faceHeight;
        return faceHeight + Math.floor(this.lineHeight() * (index + 1.5));
    }
}
//-----------------------------------------------------------------------------
// Window_EquipCommand
//
// The window for selecting a command on the equipment screen.

class Window_EquipCommand extends Window_HorzCommand {
    maxCols() {
        return 3;
    }
    makeCommandList() {
        this.addCommand(TextManager.equip2, "equip");
        this.addCommand(TextManager.optimize, "optimize");
        this.addCommand(TextManager.clear, "clear");
    }
}
//-----------------------------------------------------------------------------
// Window_EquipSlot
//
// The window for selecting an equipment slot on the equipment screen.

class Window_EquipSlot extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
        this.refresh();
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    }
    update() {
        Window_StatusBase.prototype.update.call(this);
        if (this._itemWindow) {
            this._itemWindow.setSlotId(this.index());
        }
    }
    maxItems() {
        return this._actor ? this._actor.equipSlots().length : 0;
    }
    item() {
        return this.itemAt(this.index());
    }
    itemAt(index) {
        return this._actor ? this._actor.equips()[index] : null;
    }
    drawItem(index) {
        if (this._actor) {
            const slotName = this.actorSlotName(this._actor, index);
            const item = this.itemAt(index);
            const slotNameWidth = this.slotNameWidth();
            const rect = this.itemLineRect(index);
            const itemWidth = rect.width - slotNameWidth;
            this.changeTextColor(ColorManager.systemColor());
            this.changePaintOpacity(this.isEnabled(index));
            this.drawText(slotName, rect.x, rect.y, slotNameWidth, rect.height);
            this.drawItemName(item, rect.x + slotNameWidth, rect.y, itemWidth);
            this.changePaintOpacity(true);
        }
    }
    slotNameWidth() {
        return 138;
    }
    isEnabled(index) {
        return this._actor ? this._actor.isEquipChangeOk(index) : false;
    }
    isCurrentItemEnabled() {
        return this.isEnabled(this.index());
    }
    setStatusWindow(statusWindow) {
        this._statusWindow = statusWindow;
        this.callUpdateHelp();
    }
    setItemWindow(itemWindow) {
        this._itemWindow = itemWindow;
    }
    updateHelp() {
        Window_StatusBase.prototype.updateHelp.call(this);
        this.setHelpWindowItem(this.item());
        if (this._statusWindow) {
            this._statusWindow.setTempActor(null);
        }
    }
}
//-----------------------------------------------------------------------------
// Window_EquipItem
//
// The window for selecting an equipment item on the equipment screen.

class Window_EquipItem extends Window_ItemList {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
        this._slotId = 0;
    }
    maxCols() {
        return 1;
    }
    colSpacing() {
        return 8;
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
            this.scrollTo(0, 0);
        }
    }
    setSlotId(slotId) {
        if (this._slotId !== slotId) {
            this._slotId = slotId;
            this.refresh();
            this.scrollTo(0, 0);
        }
    }
    includes(item) {
        if (item === null) {
            return true;
        }
        return (
            this._actor &&
            this._actor.canEquip(item) &&
            item.etypeId === this.etypeId()
        );
    }
    etypeId() {
        if (this._actor && this._slotId >= 0) {
            return this._actor.equipSlots()[this._slotId];
        } else {
            return 0;
        }
    }
    isEnabled( /*item*/) {
        return true;
    }
    selectLast() {
        //
    }
    setStatusWindow(statusWindow) {
        this._statusWindow = statusWindow;
        this.callUpdateHelp();
    }
    updateHelp() {
        Window_ItemList.prototype.updateHelp.call(this);
        if (this._actor && this._statusWindow && this._slotId >= 0) {
            const actor = JsonEx.makeDeepCopy(this._actor);
            actor.forceChangeEquip(this._slotId, this.item());
            this._statusWindow.setTempActor(actor);
        }
    }
    playOkSound() {
        //
    }
}
//-----------------------------------------------------------------------------
// Window_Status
//
// The window for displaying full status on the status screen.

class Window_Status extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
        this.refresh();
        this.activate();
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    }
    refresh() {
        Window_StatusBase.prototype.refresh.call(this);
        if (this._actor) {
            this.drawBlock1();
            this.drawBlock2();
        }
    }
    drawBlock1() {
        const y = this.block1Y();
        this.drawActorName(this._actor, 6, y, 168);
        this.drawActorClass(this._actor, 192, y, 168);
        this.drawActorNickname(this._actor, 432, y, 270);
    }
    block1Y() {
        return 0;
    }
    drawBlock2() {
        const y = this.block2Y();
        this.drawActorFace(this._actor, 12, y);
        this.drawBasicInfo(204, y);
        this.drawExpInfo(456, y);
    }
    block2Y() {
        const lineHeight = this.lineHeight();
        const min = lineHeight;
        const max = this.innerHeight - lineHeight * 4;
        return Math.floor((lineHeight * 1.4).clamp(min, max));
    }
    drawBasicInfo(x, y) {
        const lineHeight = this.lineHeight();
        this.drawActorLevel(this._actor, x, y + lineHeight * 0);
        this.drawActorIcons(this._actor, x, y + lineHeight * 1);
        this.placeBasicGauges(this._actor, x, y + lineHeight * 2);
    }
    drawExpInfo(x, y) {
        const lineHeight = this.lineHeight();
        const expTotal = TextManager.expTotal.format(TextManager.exp);
        const expNext = TextManager.expNext.format(TextManager.level);
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(expTotal, x, y + lineHeight * 0, 270);
        this.drawText(expNext, x, y + lineHeight * 2, 270);
        this.resetTextColor();
        this.drawText(this.expTotalValue(), x, y + lineHeight * 1, 270, "right");
        this.drawText(this.expNextValue(), x, y + lineHeight * 3, 270, "right");
    }
    expTotalValue() {
        if (this._actor.isMaxLevel()) {
            return "-------";
        } else {
            return this._actor.currentExp();
        }
    }
    expNextValue() {
        if (this._actor.isMaxLevel()) {
            return "-------";
        } else {
            return this._actor.nextRequiredExp();
        }
    }
}
//-----------------------------------------------------------------------------
// Window_StatusParams
//
// The window for displaying parameters on the status screen.

class Window_StatusParams extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    }
    maxItems() {
        return 6;
    }
    itemHeight() {
        return this.lineHeight();
    }
    drawItem(index) {
        const rect = this.itemLineRect(index);
        const paramId = index + 2;
        const name = TextManager.param(paramId);
        const value = this._actor.param(paramId);
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(name, rect.x, rect.y, 160);
        this.resetTextColor();
        this.drawText(value, rect.x + 160, rect.y, 60, "right");
    }
    drawItemBackground( /*index*/) {
        //
    }
}
//-----------------------------------------------------------------------------
// Window_StatusEquip
//
// The window for displaying equipment items on the status screen.

class Window_StatusEquip extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
    }
    setActor(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    }
    maxItems() {
        return this._actor ? this._actor.equipSlots().length : 0;
    }
    itemHeight() {
        return this.lineHeight();
    }
    drawItem(index) {
        const rect = this.itemLineRect(index);
        const equips = this._actor.equips();
        const item = equips[index];
        const slotName = this.actorSlotName(this._actor, index);
        const sw = 138;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(slotName, rect.x, rect.y, sw, rect.height);
        this.drawItemName(item, rect.x + sw, rect.y, rect.width - sw);
    }
    drawItemBackground( /*index*/) {
        //
    }
}
//-----------------------------------------------------------------------------
// Window_Options
//
// The window for changing various settings on the options screen.

class Window_Options extends Window_Command {
    makeCommandList() {
        this.addGeneralOptions();
        this.addVolumeOptions();
    }
    addGeneralOptions() {
        this.addCommand(TextManager.alwaysDash, "alwaysDash");
        this.addCommand(TextManager.commandRemember, "commandRemember");
        this.addCommand(TextManager.touchUI, "touchUI");
    }
    addVolumeOptions() {
        this.addCommand(TextManager.bgmVolume, "bgmVolume");
        this.addCommand(TextManager.bgsVolume, "bgsVolume");
        this.addCommand(TextManager.meVolume, "meVolume");
        this.addCommand(TextManager.seVolume, "seVolume");
    }
    drawItem(index) {
        const title = this.commandName(index);
        const status = this.statusText(index);
        const rect = this.itemLineRect(index);
        const statusWidth = this.statusWidth();
        const titleWidth = rect.width - statusWidth;
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(title, rect.x, rect.y, titleWidth, "left");
        this.drawText(status, rect.x + titleWidth, rect.y, statusWidth, "right");
    }
    statusWidth() {
        return 120;
    }
    statusText(index) {
        const symbol = this.commandSymbol(index);
        const value = this.getConfigValue(symbol);
        if (this.isVolumeSymbol(symbol)) {
            return this.volumeStatusText(value);
        } else {
            return this.booleanStatusText(value);
        }
    }
    isVolumeSymbol(symbol) {
        return symbol.includes("Volume");
    }
    booleanStatusText(value) {
        return value ? "ON" : "OFF";
    }
    volumeStatusText(value) {
        return value + "%";
    }
    processOk() {
        const index = this.index();
        const symbol = this.commandSymbol(index);
        if (this.isVolumeSymbol(symbol)) {
            this.changeVolume(symbol, true, true);
        } else {
            this.changeValue(symbol, !this.getConfigValue(symbol));
        }
    }
    cursorRight() {
        const index = this.index();
        const symbol = this.commandSymbol(index);
        if (this.isVolumeSymbol(symbol)) {
            this.changeVolume(symbol, true, false);
        } else {
            this.changeValue(symbol, true);
        }
    }
    cursorLeft() {
        const index = this.index();
        const symbol = this.commandSymbol(index);
        if (this.isVolumeSymbol(symbol)) {
            this.changeVolume(symbol, false, false);
        } else {
            this.changeValue(symbol, false);
        }
    }
    changeVolume(symbol, forward, wrap) {
        const lastValue = this.getConfigValue(symbol);
        const offset = this.volumeOffset();
        const value = lastValue + (forward ? offset : -offset);
        if (value > 100 && wrap) {
            this.changeValue(symbol, 0);
        } else {
            this.changeValue(symbol, value.clamp(0, 100));
        }
    }
    volumeOffset() {
        return 20;
    }
    changeValue(symbol, value) {
        const lastValue = this.getConfigValue(symbol);
        if (lastValue !== value) {
            this.setConfigValue(symbol, value);
            this.redrawItem(this.findSymbol(symbol));
            this.playCursorSound();
        }
    }
    getConfigValue(symbol) {
        return ConfigManager[symbol];
    }
    setConfigValue(symbol, volume) {
        ConfigManager[symbol] = volume;
    }
}
//-----------------------------------------------------------------------------
// Window_SavefileList
//
// The window for selecting a save file on the save and load screens.

class Window_SavefileList extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this.activate();
        this._mode = null;
        this._autosave = false;
    }
    setMode(mode, autosave) {
        this._mode = mode;
        this._autosave = autosave;
        this.refresh();
    }
    maxItems() {
        return DataManager.maxSavefiles() - (this._autosave ? 0 : 1);
    }
    numVisibleRows() {
        return 5;
    }
    itemHeight() {
        return Math.floor(this.innerHeight / this.numVisibleRows());
    }
    drawItem(index) {
        const savefileId = this.indexToSavefileId(index);
        const info = DataManager.savefileInfo(savefileId);
        const rect = this.itemRectWithPadding(index);
        this.resetTextColor();
        this.changePaintOpacity(this.isEnabled(savefileId));
        this.drawTitle(savefileId, rect.x, rect.y + 4);
        if (info) {
            this.drawContents(info, rect);
        }
    }
    indexToSavefileId(index) {
        return index + (this._autosave ? 0 : 1);
    }
    savefileIdToIndex(savefileId) {
        return savefileId - (this._autosave ? 0 : 1);
    }
    isEnabled(savefileId) {
        if (this._mode === "save") {
            return savefileId > 0;
        } else {
            return !!DataManager.savefileInfo(savefileId);
        }
    }
    savefileId() {
        return this.indexToSavefileId(this.index());
    }
    selectSavefile(savefileId) {
        const index = Math.max(0, this.savefileIdToIndex(savefileId));
        this.select(index);
        this.setTopRow(index - 2);
    }
    drawTitle(savefileId, x, y) {
        if (savefileId === 0) {
            this.drawText(TextManager.autosave, x, y, 180);
        } else {
            this.drawText(TextManager.file + " " + savefileId, x, y, 180);
        }
    }
    drawContents(info, rect) {
        const bottom = rect.y + rect.height;
        if (rect.width >= 420) {
            this.drawPartyCharacters(info, rect.x + 220, bottom - 8);
        }
        const lineHeight = this.lineHeight();
        const y2 = bottom - lineHeight - 4;
        if (y2 >= lineHeight) {
            this.drawPlaytime(info, rect.x, y2, rect.width);
        }
    }
    drawPartyCharacters(info, x, y) {
        if (info.characters) {
            let characterX = x;
            for (const data of info.characters) {
                this.drawCharacter(data[0], data[1], characterX, y);
                characterX += 48;
            }
        }
    }
    drawPlaytime(info, x, y, width) {
        if (info.playtime) {
            this.drawText(info.playtime, x, y, width, "right");
        }
    }
    playOkSound() {
        //
    }
}
//-----------------------------------------------------------------------------
// Window_ShopCommand
//
// The window for selecting buy/sell on the shop screen.

class Window_ShopCommand extends Window_HorzCommand {
    setPurchaseOnly(purchaseOnly) {
        this._purchaseOnly = purchaseOnly;
        this.refresh();
    }
    maxCols() {
        return 3;
    }
    makeCommandList() {
        this.addCommand(TextManager.buy, "buy");
        this.addCommand(TextManager.sell, "sell", !this._purchaseOnly);
        this.addCommand(TextManager.cancel, "cancel");
    }
}
//-----------------------------------------------------------------------------
// Window_ShopBuy
//
// The window for selecting an item to buy on the shop screen.

class Window_ShopBuy extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._money = 0;
    }
    setupGoods(shopGoods) {
        this._shopGoods = shopGoods;
        this.refresh();
        this.select(0);
    }
    maxItems() {
        return this._data ? this._data.length : 1;
    }
    item() {
        return this.itemAt(this.index());
    }
    itemAt(index) {
        return this._data && index >= 0 ? this._data[index] : null;
    }
    setMoney(money) {
        this._money = money;
        this.refresh();
    }
    isCurrentItemEnabled() {
        return this.isEnabled(this._data[this.index()]);
    }
    price(item) {
        return this._price[this._data.indexOf(item)] || 0;
    }
    isEnabled(item) {
        return (
            item && this.price(item) <= this._money && !$gameParty.hasMaxItems(item)
        );
    }
    refresh() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    }
    makeItemList() {
        this._data = [];
        this._price = [];
        for (const goods of this._shopGoods) {
            const item = this.goodsToItem(goods);
            if (item) {
                this._data.push(item);
                this._price.push(goods[2] === 0 ? item.price : goods[3]);
            }
        }
    }
    goodsToItem(goods) {
        switch (goods[0]) {
            case 0:
                return $dataItems[goods[1]];
            case 1:
                return $dataWeapons[goods[1]];
            case 2:
                return $dataArmors[goods[1]];
            default:
                return null;
        }
    }
    drawItem(index) {
        const item = this.itemAt(index);
        const price = this.price(item);
        const rect = this.itemLineRect(index);
        const priceWidth = this.priceWidth();
        const priceX = rect.x + rect.width - priceWidth;
        const nameWidth = rect.width - priceWidth;
        this.changePaintOpacity(this.isEnabled(item));
        this.drawItemName(item, rect.x, rect.y, nameWidth);
        this.drawText(price, priceX, rect.y, priceWidth, "right");
        this.changePaintOpacity(true);
    }
    priceWidth() {
        return 96;
    }
    setStatusWindow(statusWindow) {
        this._statusWindow = statusWindow;
        this.callUpdateHelp();
    }
    updateHelp() {
        this.setHelpWindowItem(this.item());
        if (this._statusWindow) {
            this._statusWindow.setItem(this.item());
        }
    }
}
//-----------------------------------------------------------------------------
// Window_ShopSell
//
// The window for selecting an item to sell on the shop screen.

class Window_ShopSell extends Window_ItemList {
    isEnabled(item) {
        return item && item.price > 0;
    }
}
//-----------------------------------------------------------------------------
// Window_ShopNumber
//
// The window for inputting quantity of items to buy or sell on the shop
// screen.

class Window_ShopNumber extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._item = null;
        this._max = 1;
        this._price = 0;
        this._number = 1;
        this._currencyUnit = TextManager.currencyUnit;
        this.createButtons();
        this.select(0);
        this._canRepeat = false;
    }
    isScrollEnabled() {
        return false;
    }
    number() {
        return this._number;
    }
    setup(item, max, price) {
        this._item = item;
        this._max = Math.floor(max);
        this._price = price;
        this._number = 1;
        this.placeButtons();
        this.refresh();
    }
    setCurrencyUnit(currencyUnit) {
        this._currencyUnit = currencyUnit;
        this.refresh();
    }
    createButtons() {
        this._buttons = [];
        if (ConfigManager.touchUI) {
            for (const type of ["down2", "down", "up", "up2", "ok"]) {
                const button = new Sprite_Button(type);
                this._buttons.push(button);
                this.addInnerChild(button);
            }
            this._buttons[0].setClickHandler(this.onButtonDown2.bind(this));
            this._buttons[1].setClickHandler(this.onButtonDown.bind(this));
            this._buttons[2].setClickHandler(this.onButtonUp.bind(this));
            this._buttons[3].setClickHandler(this.onButtonUp2.bind(this));
            this._buttons[4].setClickHandler(this.onButtonOk.bind(this));
        }
    }
    placeButtons() {
        const sp = this.buttonSpacing();
        const totalWidth = this.totalButtonWidth();
        let x = (this.innerWidth - totalWidth) / 2;
        for (const button of this._buttons) {
            button.x = x;
            button.y = this.buttonY();
            x += button.width + sp;
        }
    }
    totalButtonWidth() {
        const sp = this.buttonSpacing();
        return this._buttons.reduce((r, button) => r + button.width + sp, -sp);
    }
    buttonSpacing() {
        return 8;
    }
    refresh() {
        Window_Selectable.prototype.refresh.call(this);
        this.drawItemBackground(0);
        this.drawCurrentItemName();
        this.drawMultiplicationSign();
        this.drawNumber();
        this.drawHorzLine();
        this.drawTotalPrice();
    }
    drawCurrentItemName() {
        const padding = this.itemPadding();
        const x = padding * 2;
        const y = this.itemNameY();
        const width = this.multiplicationSignX() - padding * 3;
        this.drawItemName(this._item, x, y, width);
    }
    drawMultiplicationSign() {
        const sign = this.multiplicationSign();
        const width = this.textWidth(sign);
        const x = this.multiplicationSignX();
        const y = this.itemNameY();
        this.resetTextColor();
        this.drawText(sign, x, y, width);
    }
    multiplicationSign() {
        return "\u00d7";
    }
    multiplicationSignX() {
        const sign = this.multiplicationSign();
        const width = this.textWidth(sign);
        return this.cursorX() - width * 2;
    }
    drawNumber() {
        const x = this.cursorX();
        const y = this.itemNameY();
        const width = this.cursorWidth() - this.itemPadding();
        this.resetTextColor();
        this.drawText(this._number, x, y, width, "right");
    }
    drawHorzLine() {
        const padding = this.itemPadding();
        const lineHeight = this.lineHeight();
        const itemY = this.itemNameY();
        const totalY = this.totalPriceY();
        const x = padding;
        const y = Math.floor((itemY + totalY + lineHeight) / 2);
        const width = this.innerWidth - padding * 2;
        this.drawRect(x, y, width, 5);
    }
    drawTotalPrice() {
        const padding = this.itemPadding();
        const total = this._price * this._number;
        const width = this.innerWidth - padding * 2;
        const y = this.totalPriceY();
        this.drawCurrencyValue(total, this._currencyUnit, 0, y, width);
    }
    itemNameY() {
        return Math.floor(this.innerHeight / 2 - this.lineHeight() * 1.5);
    }
    totalPriceY() {
        return Math.floor(this.itemNameY() + this.lineHeight() * 2);
    }
    buttonY() {
        return Math.floor(this.totalPriceY() + this.lineHeight() * 2);
    }
    cursorWidth() {
        const padding = this.itemPadding();
        const digitWidth = this.textWidth("0");
        return this.maxDigits() * digitWidth + padding * 2;
    }
    cursorX() {
        const padding = this.itemPadding();
        return this.innerWidth - this.cursorWidth() - padding * 2;
    }
    maxDigits() {
        return 2;
    }
    update() {
        Window_Selectable.prototype.update.call(this);
        this.processNumberChange();
    }
    playOkSound() {
        //
    }
    processNumberChange() {
        if (this.isOpenAndActive()) {
            if (Input.isRepeated("right")) {
                this.changeNumber(1);
            }
            if (Input.isRepeated("left")) {
                this.changeNumber(-1);
            }
            if (Input.isRepeated("up")) {
                this.changeNumber(10);
            }
            if (Input.isRepeated("down")) {
                this.changeNumber(-10);
            }
        }
    }
    changeNumber(amount) {
        const lastNumber = this._number;
        this._number = (this._number + amount).clamp(1, this._max);
        if (this._number !== lastNumber) {
            this.playCursorSound();
            this.refresh();
        }
    }
    itemRect() {
        const rect = new Rectangle();
        rect.x = this.cursorX();
        rect.y = this.itemNameY();
        rect.width = this.cursorWidth();
        rect.height = this.lineHeight();
        return rect;
    }
    isTouchOkEnabled() {
        return false;
    }
    onButtonUp() {
        this.changeNumber(1);
    }
    onButtonUp2() {
        this.changeNumber(10);
    }
    onButtonDown() {
        this.changeNumber(-1);
    }
    onButtonDown2() {
        this.changeNumber(-10);
    }
    onButtonOk() {
        this.processOk();
    }
}
//-----------------------------------------------------------------------------
// Window_ShopStatus
//
// The window for displaying number of items in possession and the actor's
// equipment on the shop screen.

class Window_ShopStatus extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._item = null;
        this._pageIndex = 0;
        this.refresh();
    }
    refresh() {
        this.contents.clear();
        if (this._item) {
            const x = this.itemPadding();
            this.drawPossession(x, 0);
            if (this.isEquipItem()) {
                const y = Math.floor(this.lineHeight() * 1.5);
                this.drawEquipInfo(x, y);
            }
        }
    }
    setItem(item) {
        this._item = item;
        this.refresh();
    }
    isEquipItem() {
        return DataManager.isWeapon(this._item) || DataManager.isArmor(this._item);
    }
    drawPossession(x, y) {
        const width = this.innerWidth - this.itemPadding() - x;
        const possessionWidth = this.textWidth("0000");
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(TextManager.possession, x, y, width - possessionWidth);
        this.resetTextColor();
        this.drawText($gameParty.numItems(this._item), x, y, width, "right");
    }
    drawEquipInfo(x, y) {
        const members = this.statusMembers();
        for (let i = 0; i < members.length; i++) {
            const actorY = y + Math.floor(this.lineHeight() * i * 2.2);
            this.drawActorEquipInfo(x, actorY, members[i]);
        }
    }
    statusMembers() {
        const start = this._pageIndex * this.pageSize();
        const end = start + this.pageSize();
        return $gameParty.members().slice(start, end);
    }
    pageSize() {
        return 4;
    }
    maxPages() {
        return Math.floor(
            ($gameParty.size() + this.pageSize() - 1) / this.pageSize()
        );
    }
    drawActorEquipInfo(x, y, actor) {
        const item1 = this.currentEquippedItem(actor, this._item.etypeId);
        const width = this.innerWidth - x - this.itemPadding();
        const enabled = actor.canEquip(this._item);
        this.changePaintOpacity(enabled);
        this.resetTextColor();
        this.drawText(actor.name(), x, y, width);
        if (enabled) {
            this.drawActorParamChange(x, y, actor, item1);
        }
        this.drawItemName(item1, x, y + this.lineHeight(), width);
        this.changePaintOpacity(true);
    }
    // prettier-ignore
    drawActorParamChange(x, y, actor, item1) {
        const width = this.innerWidth - this.itemPadding() - x;
        const paramId = this.paramId();
        const change = this._item.params[paramId] - (item1 ? item1.params[paramId] : 0);
        this.changeTextColor(ColorManager.paramchangeTextColor(change));
        this.drawText((change > 0 ? "+" : "") + change, x, y, width, "right");
    }
    paramId() {
        return DataManager.isWeapon(this._item) ? 2 : 3;
    }
    currentEquippedItem(actor, etypeId) {
        const list = [];
        const equips = actor.equips();
        const slots = actor.equipSlots();
        for (let i = 0; i < slots.length; i++) {
            if (slots[i] === etypeId) {
                list.push(equips[i]);
            }
        }
        const paramId = this.paramId();
        let worstParam = Number.MAX_VALUE;
        let worstItem = null;
        for (const item of list) {
            if (item && item.params[paramId] < worstParam) {
                worstParam = item.params[paramId];
                worstItem = item;
            }
        }
        return worstItem;
    }
    update() {
        Window_StatusBase.prototype.update.call(this);
        this.updatePage();
    }
    updatePage() {
        if (this.isPageChangeEnabled() && this.isPageChangeRequested()) {
            this.changePage();
        }
    }
    isPageChangeEnabled() {
        return this.visible && this.maxPages() >= 2;
    }
    isPageChangeRequested() {
        if (Input.isTriggered("shift")) {
            return true;
        }
        if (TouchInput.isTriggered() && this.isTouchedInsideFrame()) {
            return true;
        }
        return false;
    }
    changePage() {
        this._pageIndex = (this._pageIndex + 1) % this.maxPages();
        this.refresh();
        this.playCursorSound();
    }
}
//-----------------------------------------------------------------------------
// Window_NameEdit
//
// The window for editing an actor's name on the name input screen.

class Window_NameEdit extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this._actor = null;
        this._maxLength = 0;
        this._name = "";
        this._index = 0;
        this._defaultName = 0;
        this.deactivate();
    }
    setup(actor, maxLength) {
        this._actor = actor;
        this._maxLength = maxLength;
        this._name = actor.name().slice(0, this._maxLength);
        this._index = this._name.length;
        this._defaultName = this._name;
        ImageManager.loadFace(actor.faceName());
    }
    name() {
        return this._name;
    }
    restoreDefault() {
        this._name = this._defaultName;
        this._index = this._name.length;
        this.refresh();
        return this._name.length > 0;
    }
    add(ch) {
        if (this._index < this._maxLength) {
            this._name += ch;
            this._index++;
            this.refresh();
            return true;
        } else {
            return false;
        }
    }
    back() {
        if (this._index > 0) {
            this._index--;
            this._name = this._name.slice(0, this._index);
            this.refresh();
            return true;
        } else {
            return false;
        }
    }
    faceWidth() {
        return 144;
    }
    charWidth() {
        const text = $gameSystem.isJapanese() ? "\uff21" : "A";
        return this.textWidth(text);
    }
    left() {
        const nameCenter = (this.innerWidth + this.faceWidth()) / 2;
        const nameWidth = (this._maxLength + 1) * this.charWidth();
        return Math.min(nameCenter - nameWidth / 2, this.innerWidth - nameWidth);
    }
    itemRect(index) {
        const x = this.left() + index * this.charWidth();
        const y = 54;
        const width = this.charWidth();
        const height = this.lineHeight();
        return new Rectangle(x, y, width, height);
    }
    underlineRect(index) {
        const rect = this.itemRect(index);
        rect.x++;
        rect.y += rect.height - 4;
        rect.width -= 2;
        rect.height = 2;
        return rect;
    }
    underlineColor() {
        return ColorManager.normalColor();
    }
    drawUnderline(index) {
        const rect = this.underlineRect(index);
        const color = this.underlineColor();
        this.contents.paintOpacity = 48;
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, color);
        this.contents.paintOpacity = 255;
    }
    drawChar(index) {
        const rect = this.itemRect(index);
        this.resetTextColor();
        this.drawText(this._name[index] || "", rect.x, rect.y);
    }
    refresh() {
        this.contents.clear();
        this.drawActorFace(this._actor, 0, 0);
        for (let i = 0; i < this._maxLength; i++) {
            this.drawUnderline(i);
        }
        for (let j = 0; j < this._name.length; j++) {
            this.drawChar(j);
        }
        const rect = this.itemRect(this._index);
        this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
    }
}
//-----------------------------------------------------------------------------
// Window_NameInput
//
// The window for selecting text characters on the name input screen.

class Window_NameInput extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._editWindow = null;
        this._page = 0;
        this._index = 0;
    }
    setEditWindow(editWindow) {
        this._editWindow = editWindow;
        this.refresh();
        this.updateCursor();
        this.activate();
    }
    table() {
        if ($gameSystem.isJapanese()) {
            return [
                Window_NameInput.JAPAN1,
                Window_NameInput.JAPAN2,
                Window_NameInput.JAPAN3
            ];
        } else if ($gameSystem.isRussian()) {
            return [Window_NameInput.RUSSIA];
        } else {
            return [Window_NameInput.LATIN1, Window_NameInput.LATIN2];
        }
    }
    maxCols() {
        return 10;
    }
    maxItems() {
        return 90;
    }
    itemWidth() {
        return Math.floor((this.innerWidth - this.groupSpacing()) / 10);
    }
    groupSpacing() {
        return 24;
    }
    character() {
        return this._index < 88 ? this.table()[this._page][this._index] : "";
    }
    isPageChange() {
        return this._index === 88;
    }
    isOk() {
        return this._index === 89;
    }
    itemRect(index) {
        const itemWidth = this.itemWidth();
        const itemHeight = this.itemHeight();
        const colSpacing = this.colSpacing();
        const rowSpacing = this.rowSpacing();
        const groupSpacing = this.groupSpacing();
        const col = index % 10;
        const group = Math.floor(col / 5);
        const x = col * itemWidth + group * groupSpacing + colSpacing / 2;
        const y = Math.floor(index / 10) * itemHeight + rowSpacing / 2;
        const width = itemWidth - colSpacing;
        const height = itemHeight - rowSpacing;
        return new Rectangle(x, y, width, height);
    }
    drawItem(index) {
        const table = this.table();
        const character = table[this._page][index];
        const rect = this.itemLineRect(index);
        this.drawText(character, rect.x, rect.y, rect.width, "center");
    }
    updateCursor() {
        const rect = this.itemRect(this._index);
        this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
    }
    isCursorMovable() {
        return this.active;
    }
    cursorDown(wrap) {
        if (this._index < 80 || wrap) {
            this._index = (this._index + 10) % 90;
        }
    }
    cursorUp(wrap) {
        if (this._index >= 10 || wrap) {
            this._index = (this._index + 80) % 90;
        }
    }
    cursorRight(wrap) {
        if (this._index % 10 < 9) {
            this._index++;
        } else if (wrap) {
            this._index -= 9;
        }
    }
    cursorLeft(wrap) {
        if (this._index % 10 > 0) {
            this._index--;
        } else if (wrap) {
            this._index += 9;
        }
    }
    cursorPagedown() {
        this._page = (this._page + 1) % this.table().length;
        this.refresh();
    }
    cursorPageup() {
        this._page = (this._page + this.table().length - 1) % this.table().length;
        this.refresh();
    }
    processCursorMove() {
        const lastPage = this._page;
        Window_Selectable.prototype.processCursorMove.call(this);
        this.updateCursor();
        if (this._page !== lastPage) {
            this.playCursorSound();
        }
    }
    processHandling() {
        if (this.isOpen() && this.active) {
            if (Input.isTriggered("shift")) {
                this.processJump();
            }
            if (Input.isRepeated("cancel")) {
                this.processBack();
            }
            if (Input.isRepeated("ok")) {
                this.processOk();
            }
        }
    }
    isCancelEnabled() {
        return true;
    }
    processCancel() {
        this.processBack();
    }
    processJump() {
        if (this._index !== 89) {
            this._index = 89;
            this.playCursorSound();
        }
    }
    processBack() {
        if (this._editWindow.back()) {
            SoundManager.playCancel();
        }
    }
    processOk() {
        if (this.character()) {
            this.onNameAdd();
        } else if (this.isPageChange()) {
            this.playOkSound();
            this.cursorPagedown();
        } else if (this.isOk()) {
            this.onNameOk();
        }
    }
    onNameAdd() {
        if (this._editWindow.add(this.character())) {
            this.playOkSound();
        } else {
            this.playBuzzerSound();
        }
    }
    onNameOk() {
        if (this._editWindow.name() === "") {
            if (this._editWindow.restoreDefault()) {
                this.playOkSound();
            } else {
                this.playBuzzerSound();
            }
        } else {
            this.playOkSound();
            this.callOkHandler();
        }
    }
}

// prettier-ignore
Window_NameInput.LATIN1 =
    ["A", "B", "C", "D", "E", "a", "b", "c", "d", "e",
        "F", "G", "H", "I", "J", "f", "g", "h", "i", "j",
        "K", "L", "M", "N", "O", "k", "l", "m", "n", "o",
        "P", "Q", "R", "S", "T", "p", "q", "r", "s", "t",
        "U", "V", "W", "X", "Y", "u", "v", "w", "x", "y",
        "Z", "[", "]", "^", "_", "z", "{", "}", "|", "~",
        "0", "1", "2", "3", "4", "!", "#", "$", "%", "&",
        "5", "6", "7", "8", "9", "(", ")", "*", "+", "-",
        "/", "=", "@", "<", ">", ":", ";", " ", "Page", "OK"];
// prettier-ignore
Window_NameInput.LATIN2 =
    ["Á", "É", "Í", "Ó", "Ú", "á", "é", "í", "ó", "ú",
        "À", "È", "Ì", "Ò", "Ù", "à", "è", "ì", "ò", "ù",
        "Â", "Ê", "Î", "Ô", "Û", "â", "ê", "î", "ô", "û",
        "Ä", "Ë", "Ï", "Ö", "Ü", "ä", "ë", "ï", "ö", "ü",
        "Ā", "Ē", "Ī", "Ō", "Ū", "ā", "ē", "ī", "ō", "ū",
        "Ã", "Å", "Æ", "Ç", "Ð", "ã", "å", "æ", "ç", "ð",
        "Ñ", "Õ", "Ø", "Š", "Ŵ", "ñ", "õ", "ø", "š", "ŵ",
        "Ý", "Ŷ", "Ÿ", "Ž", "Þ", "ý", "ÿ", "ŷ", "ž", "þ",
        "Ĳ", "Œ", "ĳ", "œ", "ß", "«", "»", " ", "Page", "OK"];
// prettier-ignore
Window_NameInput.RUSSIA =
    ["А", "Б", "В", "Г", "Д", "а", "б", "в", "г", "д",
        "Е", "Ё", "Ж", "З", "И", "е", "ё", "ж", "з", "и",
        "Й", "К", "Л", "М", "Н", "й", "к", "л", "м", "н",
        "О", "П", "Р", "С", "Т", "о", "п", "р", "с", "т",
        "У", "Ф", "Х", "Ц", "Ч", "у", "ф", "х", "ц", "ч",
        "Ш", "Щ", "Ъ", "Ы", "Ь", "ш", "щ", "ъ", "ы", "ь",
        "Э", "Ю", "Я", "^", "_", "э", "ю", "я", "%", "&",
        "0", "1", "2", "3", "4", "(", ")", "*", "+", "-",
        "5", "6", "7", "8", "9", ":", ";", " ", "", "OK"];
// prettier-ignore
Window_NameInput.JAPAN1 =
    ["あ", "い", "う", "え", "お", "が", "ぎ", "ぐ", "げ", "ご",
        "か", "き", "く", "け", "こ", "ざ", "じ", "ず", "ぜ", "ぞ",
        "さ", "し", "す", "せ", "そ", "だ", "ぢ", "づ", "で", "ど",
        "た", "ち", "つ", "て", "と", "ば", "び", "ぶ", "べ", "ぼ",
        "な", "に", "ぬ", "ね", "の", "ぱ", "ぴ", "ぷ", "ぺ", "ぽ",
        "は", "ひ", "ふ", "へ", "ほ", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ",
        "ま", "み", "む", "め", "も", "っ", "ゃ", "ゅ", "ょ", "ゎ",
        "や", "ゆ", "よ", "わ", "ん", "ー", "～", "・", "＝", "☆",
        "ら", "り", "る", "れ", "ろ", "ゔ", "を", "　", "カナ", "決定"];
// prettier-ignore
Window_NameInput.JAPAN2 =
    ["ア", "イ", "ウ", "エ", "オ", "ガ", "ギ", "グ", "ゲ", "ゴ",
        "カ", "キ", "ク", "ケ", "コ", "ザ", "ジ", "ズ", "ゼ", "ゾ",
        "サ", "シ", "ス", "セ", "ソ", "ダ", "ヂ", "ヅ", "デ", "ド",
        "タ", "チ", "ツ", "テ", "ト", "バ", "ビ", "ブ", "ベ", "ボ",
        "ナ", "ニ", "ヌ", "ネ", "ノ", "パ", "ピ", "プ", "ペ", "ポ",
        "ハ", "ヒ", "フ", "ヘ", "ホ", "ァ", "ィ", "ゥ", "ェ", "ォ",
        "マ", "ミ", "ム", "メ", "モ", "ッ", "ャ", "ュ", "ョ", "ヮ",
        "ヤ", "ユ", "ヨ", "ワ", "ン", "ー", "～", "・", "＝", "☆",
        "ラ", "リ", "ル", "レ", "ロ", "ヴ", "ヲ", "　", "英数", "決定"];
// prettier-ignore
Window_NameInput.JAPAN3 =
    ["Ａ", "Ｂ", "Ｃ", "Ｄ", "Ｅ", "ａ", "ｂ", "ｃ", "ｄ", "ｅ",
        "Ｆ", "Ｇ", "Ｈ", "Ｉ", "Ｊ", "ｆ", "ｇ", "ｈ", "ｉ", "ｊ",
        "Ｋ", "Ｌ", "Ｍ", "Ｎ", "Ｏ", "ｋ", "ｌ", "ｍ", "ｎ", "ｏ",
        "Ｐ", "Ｑ", "Ｒ", "Ｓ", "Ｔ", "ｐ", "ｑ", "ｒ", "ｓ", "ｔ",
        "Ｕ", "Ｖ", "Ｗ", "Ｘ", "Ｙ", "ｕ", "ｖ", "ｗ", "ｘ", "ｙ",
        "Ｚ", "［", "］", "＾", "＿", "ｚ", "｛", "｝", "｜", "～",
        "０", "１", "２", "３", "４", "！", "＃", "＄", "％", "＆",
        "５", "６", "７", "８", "９", "（", "）", "＊", "＋", "－",
        "／", "＝", "＠", "＜", "＞", "：", "；", "　", "かな", "決定"];

//-----------------------------------------------------------------------------
// Window_NameBox
//
// The window for displaying a speaker name above the message window.

class Window_NameBox extends Window_Base {
    initialize() {
        Window_Base.prototype.initialize.call(this, new Rectangle());
        this.openness = 0;
        this._name = "";
    }
    setMessageWindow(messageWindow) {
        this._messageWindow = messageWindow;
    }
    setName(name) {
        if (this._name !== name) {
            this._name = name;
            this.refresh();
        }
    }
    clear() {
        this.setName("");
    }
    start() {
        this.updatePlacement();
        this.updateBackground();
        this.createContents();
        this.refresh();
    }
    updatePlacement() {
        this.width = this.windowWidth();
        this.height = this.windowHeight();
        const messageWindow = this._messageWindow;
        if ($gameMessage.isRTL()) {
            this.x = messageWindow.x + messageWindow.width - this.width;
        } else {
            this.x = messageWindow.x;
        }
        if (messageWindow.y > 0) {
            this.y = messageWindow.y - this.height;
        } else {
            this.y = messageWindow.y + messageWindow.height;
        }
    }
    updateBackground() {
        this.setBackgroundType($gameMessage.background());
    }
    windowWidth() {
        if (this._name) {
            const textWidth = this.textSizeEx(this._name).width;
            const padding = this.padding + this.itemPadding();
            const width = Math.ceil(textWidth) + padding * 2;
            return Math.min(width, Graphics.boxWidth);
        } else {
            return 0;
        }
    }
    windowHeight() {
        return this.fittingHeight(1);
    }
    refresh() {
        const rect = this.baseTextRect();
        this.contents.clear();
        this.drawTextEx(this._name, rect.x, rect.y, rect.width);
    }
}
//-----------------------------------------------------------------------------
// Window_ChoiceList
//
// The window used for the event command [Show Choices].

class Window_ChoiceList extends Window_Command {
    initialize() {
        Window_Command.prototype.initialize.call(this, new Rectangle());
        this.createCancelButton();
        this.openness = 0;
        this.deactivate();
        this._background = 0;
        this._canRepeat = false;
    }
    setMessageWindow(messageWindow) {
        this._messageWindow = messageWindow;
    }
    createCancelButton() {
        if (ConfigManager.touchUI) {
            this._cancelButton = new Sprite_Button("cancel");
            this._cancelButton.visible = false;
            this.addChild(this._cancelButton);
        }
    }
    start() {
        this.updatePlacement();
        this.updateBackground();
        this.placeCancelButton();
        this.createContents();
        this.refresh();
        this.scrollTo(0, 0);
        this.selectDefault();
        this.open();
        this.activate();
    }
    update() {
        Window_Selectable.prototype.update.call(this);
        this.updateCancelButton();
    }
    updateCancelButton() {
        if (this._cancelButton) {
            this._cancelButton.visible = this.needsCancelButton() && this.isOpen();
        }
    }
    selectDefault() {
        this.select($gameMessage.choiceDefaultType());
    }
    updatePlacement() {
        this.x = this.windowX();
        this.y = this.windowY();
        this.width = this.windowWidth();
        this.height = this.windowHeight();
    }
    updateBackground() {
        this._background = $gameMessage.choiceBackground();
        this.setBackgroundType(this._background);
    }
    placeCancelButton() {
        if (this._cancelButton) {
            const spacing = 8;
            const button = this._cancelButton;
            const right = this.x + this.width;
            if (right < Graphics.boxWidth - button.width + spacing) {
                button.x = this.width + spacing;
            } else {
                button.x = -button.width - spacing;
            }
            button.y = this.height / 2 - button.height / 2;
        }
    }
    windowX() {
        const positionType = $gameMessage.choicePositionType();
        if (positionType === 1) {
            return (Graphics.boxWidth - this.windowWidth()) / 2;
        } else if (positionType === 2) {
            return Graphics.boxWidth - this.windowWidth();
        } else {
            return 0;
        }
    }
    windowY() {
        const messageY = this._messageWindow.y;
        if (messageY >= Graphics.boxHeight / 2) {
            return messageY - this.windowHeight();
        } else {
            return messageY + this._messageWindow.height;
        }
    }
    windowWidth() {
        const width = this.maxChoiceWidth() + this.colSpacing() + this.padding * 2;
        return Math.min(width, Graphics.boxWidth);
    }
    windowHeight() {
        return this.fittingHeight(this.numVisibleRows());
    }
    numVisibleRows() {
        const choices = $gameMessage.choices();
        return Math.min(choices.length, this.maxLines());
    }
    maxLines() {
        const messageWindow = this._messageWindow;
        const messageY = messageWindow ? messageWindow.y : 0;
        const messageHeight = messageWindow ? messageWindow.height : 0;
        const centerY = Graphics.boxHeight / 2;
        if (messageY < centerY && messageY + messageHeight > centerY) {
            return 4;
        } else {
            return 8;
        }
    }
    maxChoiceWidth() {
        let maxWidth = 96;
        const choices = $gameMessage.choices();
        for (const choice of choices) {
            const textWidth = this.textSizeEx(choice).width;
            const choiceWidth = Math.ceil(textWidth) + this.itemPadding() * 2;
            if (maxWidth < choiceWidth) {
                maxWidth = choiceWidth;
            }
        }
        return maxWidth;
    }
    makeCommandList() {
        const choices = $gameMessage.choices();
        for (const choice of choices) {
            this.addCommand(choice, "choice");
        }
    }
    drawItem(index) {
        const rect = this.itemLineRect(index);
        this.drawTextEx(this.commandName(index), rect.x, rect.y, rect.width);
    }
    isCancelEnabled() {
        return $gameMessage.choiceCancelType() !== -1;
    }
    needsCancelButton() {
        return $gameMessage.choiceCancelType() === -2;
    }
    callOkHandler() {
        $gameMessage.onChoice(this.index());
        this._messageWindow.terminateMessage();
        this.close();
    }
    callCancelHandler() {
        $gameMessage.onChoice($gameMessage.choiceCancelType());
        this._messageWindow.terminateMessage();
        this.close();
    }
}
//-----------------------------------------------------------------------------
// Window_NumberInput
//
// The window used for the event command [Input Number].

class Window_NumberInput extends Window_Selectable {
    initialize() {
        Window_Selectable.prototype.initialize.call(this, new Rectangle());
        this._number = 0;
        this._maxDigits = 1;
        this.openness = 0;
        this.createButtons();
        this.deactivate();
        this._canRepeat = false;
    }
    setMessageWindow(messageWindow) {
        this._messageWindow = messageWindow;
    }
    start() {
        this._maxDigits = $gameMessage.numInputMaxDigits();
        this._number = $gameVariables.value($gameMessage.numInputVariableId());
        this._number = this._number.clamp(0, Math.pow(10, this._maxDigits) - 1);
        this.updatePlacement();
        this.placeButtons();
        this.createContents();
        this.refresh();
        this.open();
        this.activate();
        this.select(0);
    }
    updatePlacement() {
        const messageY = this._messageWindow.y;
        const spacing = 8;
        this.width = this.windowWidth();
        this.height = this.windowHeight();
        this.x = (Graphics.boxWidth - this.width) / 2;
        if (messageY >= Graphics.boxHeight / 2) {
            this.y = messageY - this.height - spacing;
        } else {
            this.y = messageY + this._messageWindow.height + spacing;
        }
    }
    windowWidth() {
        const totalItemWidth = this.maxCols() * this.itemWidth();
        const totalButtonWidth = this.totalButtonWidth();
        return Math.max(totalItemWidth, totalButtonWidth) + this.padding * 2;
    }
    windowHeight() {
        if (ConfigManager.touchUI) {
            return this.fittingHeight(1) + this.buttonSpacing() + 48;
        } else {
            return this.fittingHeight(1);
        }
    }
    maxCols() {
        return this._maxDigits;
    }
    maxItems() {
        return this._maxDigits;
    }
    itemWidth() {
        return 48;
    }
    itemRect(index) {
        const rect = Window_Selectable.prototype.itemRect.call(this, index);
        const innerMargin = this.innerWidth - this.maxCols() * this.itemWidth();
        rect.x += innerMargin / 2;
        return rect;
    }
    isScrollEnabled() {
        return false;
    }
    isHoverEnabled() {
        return false;
    }
    createButtons() {
        this._buttons = [];
        if (ConfigManager.touchUI) {
            for (const type of ["down", "up", "ok"]) {
                const button = new Sprite_Button(type);
                this._buttons.push(button);
                this.addInnerChild(button);
            }
            this._buttons[0].setClickHandler(this.onButtonDown.bind(this));
            this._buttons[1].setClickHandler(this.onButtonUp.bind(this));
            this._buttons[2].setClickHandler(this.onButtonOk.bind(this));
        }
    }
    placeButtons() {
        const sp = this.buttonSpacing();
        const totalWidth = this.totalButtonWidth();
        let x = (this.innerWidth - totalWidth) / 2;
        for (const button of this._buttons) {
            button.x = x;
            button.y = this.buttonY();
            x += button.width + sp;
        }
    }
    totalButtonWidth() {
        const sp = this.buttonSpacing();
        return this._buttons.reduce((r, button) => r + button.width + sp, -sp);
    }
    buttonSpacing() {
        return 8;
    }
    buttonY() {
        return this.itemHeight() + this.buttonSpacing();
    }
    update() {
        Window_Selectable.prototype.update.call(this);
        this.processDigitChange();
    }
    processDigitChange() {
        if (this.isOpenAndActive()) {
            if (Input.isRepeated("up")) {
                this.changeDigit(true);
            } else if (Input.isRepeated("down")) {
                this.changeDigit(false);
            }
        }
    }
    changeDigit(up) {
        const index = this.index();
        const place = Math.pow(10, this._maxDigits - 1 - index);
        let n = Math.floor(this._number / place) % 10;
        this._number -= n * place;
        if (up) {
            n = (n + 1) % 10;
        } else {
            n = (n + 9) % 10;
        }
        this._number += n * place;
        this.refresh();
        this.playCursorSound();
    }
    isTouchOkEnabled() {
        return false;
    }
    isOkEnabled() {
        return true;
    }
    isCancelEnabled() {
        return false;
    }
    processOk() {
        this.playOkSound();
        $gameVariables.setValue($gameMessage.numInputVariableId(), this._number);
        this._messageWindow.terminateMessage();
        this.updateInputData();
        this.deactivate();
        this.close();
    }
    drawItem(index) {
        const rect = this.itemLineRect(index);
        const align = "center";
        const s = this._number.padZero(this._maxDigits);
        const c = s.slice(index, index + 1);
        this.resetTextColor();
        this.drawText(c, rect.x, rect.y, rect.width, align);
    }
    onButtonUp() {
        this.changeDigit(true);
    }
    onButtonDown() {
        this.changeDigit(false);
    }
    onButtonOk() {
        this.processOk();
    }
}
//-----------------------------------------------------------------------------
// Window_EventItem
//
// The window used for the event command [Select Item].

class Window_EventItem extends Window_ItemList {
    initialize(rect) {
        super.initialize(rect);
        this.createCancelButton();
        this.openness = 0;
        this.deactivate();
        this.setHandler("ok", this.onOk.bind(this));
        this.setHandler("cancel", this.onCancel.bind(this));
        this._canRepeat = false;
    }
    setMessageWindow(messageWindow) {
        this._messageWindow = messageWindow;
    }
    createCancelButton() {
        if (ConfigManager.touchUI) {
            this._cancelButton = new Sprite_Button("cancel");
            this._cancelButton.visible = false;
            this.addChild(this._cancelButton);
        }
    }
    start() {
        this.refresh();
        this.updatePlacement();
        this.placeCancelButton();
        this.forceSelect(0);
        this.open();
        this.activate();
    }
    update() {
        Window_Selectable.prototype.update.call(this);
        this.updateCancelButton();
    }
    updateCancelButton() {
        if (this._cancelButton) {
            this._cancelButton.visible = this.isOpen();
        }
    }
    updatePlacement() {
        if (this._messageWindow.y >= Graphics.boxHeight / 2) {
            this.y = 0;
        } else {
            this.y = Graphics.boxHeight - this.height;
        }
    }
    placeCancelButton() {
        if (this._cancelButton) {
            const spacing = 8;
            const button = this._cancelButton;
            if (this.y === 0) {
                button.y = this.height + spacing;
            } else if (this._messageWindow.y >= Graphics.boxHeight / 4) {
                const distance = this.y - this._messageWindow.y;
                button.y = -button.height - spacing - distance;
            } else {
                button.y = -button.height - spacing;
            }
            button.x = this.width - button.width - spacing;
        }
    }
    includes(item) {
        const itypeId = $gameMessage.itemChoiceItypeId();
        return DataManager.isItem(item) && item.itypeId === itypeId;
    }
    needsNumber() {
        const itypeId = $gameMessage.itemChoiceItypeId();
        if (itypeId === 2) {
            // Key Item
            return $dataSystem.optKeyItemsNumber;
        } else if (itypeId >= 3) {
            // Hidden Item
            return false;
        } else {
            // Normal Item
            return true;
        }
    }
    isEnabled( /*item*/) {
        return true;
    }
    onOk() {
        const item = this.item();
        const itemId = item ? item.id : 0;
        $gameVariables.setValue($gameMessage.itemChoiceVariableId(), itemId);
        this._messageWindow.terminateMessage();
        this.close();
    }
    onCancel() {
        $gameVariables.setValue($gameMessage.itemChoiceVariableId(), 0);
        this._messageWindow.terminateMessage();
        this.close();
    }
}
//-----------------------------------------------------------------------------
// Window_Message
//
// The window for displaying text messages.

class Window_Message extends Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this.openness = 0;
        this.initMembers();
    }
    initMembers() {
        this._background = 0;
        this._positionType = 2;
        this._waitCount = 0;
        this._faceBitmap = null;
        this._textState = null;
        this._goldWindow = null;
        this._nameBoxWindow = null;
        this._choiceListWindow = null;
        this._numberInputWindow = null;
        this._eventItemWindow = null;
        this.clearFlags();
    }
    setGoldWindow(goldWindow) {
        this._goldWindow = goldWindow;
    }
    setNameBoxWindow(nameBoxWindow) {
        this._nameBoxWindow = nameBoxWindow;
    }
    setChoiceListWindow(choiceListWindow) {
        this._choiceListWindow = choiceListWindow;
    }
    setNumberInputWindow(numberInputWindow) {
        this._numberInputWindow = numberInputWindow;
    }
    setEventItemWindow(eventItemWindow) {
        this._eventItemWindow = eventItemWindow;
    }
    clearFlags() {
        this._showFast = false;
        this._lineShowFast = false;
        this._pauseSkip = false;
    }
    update() {
        this.checkToNotClose();
        Window_Base.prototype.update.call(this);
        while (!this.isOpening() && !this.isClosing()) {
            if (this.updateWait()) {
                return;
            } else if (this.updateLoading()) {
                return;
            } else if (this.updateInput()) {
                return;
            } else if (this.updateMessage()) {
                return;
            } else if (this.canStart()) {
                this.startMessage();
            } else {
                this.startInput();
                return;
            }
        }
    }
    checkToNotClose() {
        if (this.isOpen() && this.isClosing() && this.doesContinue()) {
            this.open();
        }
    }
    synchronizeNameBox() {
        this._nameBoxWindow.openness = this.openness;
    }
    canStart() {
        return $gameMessage.hasText() && !$gameMessage.scrollMode();
    }
    startMessage() {
        const text = $gameMessage.allText();
        const textState = this.createTextState(text, 0, 0, 0);
        textState.x = this.newLineX(textState);
        textState.startX = textState.x;
        this._textState = textState;
        this.newPage(this._textState);
        this.updatePlacement();
        this.updateBackground();
        this.open();
        this._nameBoxWindow.start();
    }
    newLineX(textState) {
        const faceExists = $gameMessage.faceName() !== "";
        const faceWidth = ImageManager.faceWidth;
        const spacing = 20;
        const margin = faceExists ? faceWidth + spacing : 4;
        return textState.rtl ? this.innerWidth - margin : margin;
    }
    updatePlacement() {
        const goldWindow = this._goldWindow;
        this._positionType = $gameMessage.positionType();
        this.y = (this._positionType * (Graphics.boxHeight - this.height)) / 2;
        if (goldWindow) {
            goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
        }
    }
    updateBackground() {
        this._background = $gameMessage.background();
        this.setBackgroundType(this._background);
    }
    terminateMessage() {
        this.close();
        this._nameBoxWindow.close();
        this._goldWindow.close();
        $gameMessage.clear();
    }
    updateWait() {
        if (this._waitCount > 0) {
            this._waitCount--;
            return true;
        } else {
            return false;
        }
    }
    cancelWait() {
        this._waitCount = 0;
    }
    updateLoading() {
        if (this._faceBitmap) {
            if (this._faceBitmap.isReady()) {
                this.drawMessageFace();
                this._faceBitmap = null;
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }
    updateInput() {
        if (this.isAnySubWindowActive()) {
            return true;
        }
        if (this.pause) {
            if (this.isTriggered()) {
                Input.update();
                this.pause = false;
                if (!this._textState) {
                    this.terminateMessage();
                }
            }
            return true;
        }
        return false;
    }
    isAnySubWindowActive() {
        return (
            this._choiceListWindow.active ||
            this._numberInputWindow.active ||
            this._eventItemWindow.active
        );
    }
    updateMessage() {
        const textState = this._textState;
        if (textState) {
            while (!this.isEndOfText(textState)) {
                if (this.needsNewPage(textState)) {
                    this.newPage(textState);
                }
                this.updateShowFast();
                this.processCharacter(textState);
                if (this.shouldBreakHere(textState)) {
                    break;
                }
            }
            this.flushTextState(textState);
            if (this.isEndOfText(textState) && !this.isWaiting()) {
                this.onEndOfText();
            }
            return true;
        } else {
            return false;
        }
    }
    shouldBreakHere(textState) {
        if (this.canBreakHere(textState)) {
            if (!this._showFast && !this._lineShowFast) {
                return true;
            }
            if (this.isWaiting()) {
                return true;
            }
        }
        return false;
    }
    canBreakHere(textState) {
        if (!this.isEndOfText(textState)) {
            const c = textState.text[textState.index];
            if (c.charCodeAt(0) >= 0xdc00 && c.charCodeAt(0) <= 0xdfff) {
                // surrogate pair
                return false;
            }
            if (textState.rtl && c.charCodeAt(0) > 0x20) {
                return false;
            }
        }
        return true;
    }
    onEndOfText() {
        if (!this.startInput()) {
            if (!this._pauseSkip) {
                this.startPause();
            } else {
                this.terminateMessage();
            }
        }
        this._textState = null;
    }
    startInput() {
        if ($gameMessage.isChoice()) {
            this._choiceListWindow.start();
            return true;
        } else if ($gameMessage.isNumberInput()) {
            this._numberInputWindow.start();
            return true;
        } else if ($gameMessage.isItemChoice()) {
            this._eventItemWindow.start();
            return true;
        } else {
            return false;
        }
    }
    isTriggered() {
        return (
            Input.isRepeated("ok") ||
            Input.isRepeated("cancel") ||
            TouchInput.isRepeated()
        );
    }
    doesContinue() {
        return (
            $gameMessage.hasText() &&
            !$gameMessage.scrollMode() &&
            !this.areSettingsChanged()
        );
    }
    areSettingsChanged() {
        return (
            this._background !== $gameMessage.background() ||
            this._positionType !== $gameMessage.positionType()
        );
    }
    updateShowFast() {
        if (this.isTriggered()) {
            this._showFast = true;
        }
    }
    newPage(textState) {
        this.contents.clear();
        this.resetFontSettings();
        this.clearFlags();
        this.updateSpeakerName();
        this.loadMessageFace();
        textState.x = textState.startX;
        textState.y = 0;
        textState.height = this.calcTextHeight(textState);
    }
    updateSpeakerName() {
        this._nameBoxWindow.setName($gameMessage.speakerName());
    }
    loadMessageFace() {
        this._faceBitmap = ImageManager.loadFace($gameMessage.faceName());
    }
    drawMessageFace() {
        const faceName = $gameMessage.faceName();
        const faceIndex = $gameMessage.faceIndex();
        const rtl = $gameMessage.isRTL();
        const width = ImageManager.faceWidth;
        const height = this.innerHeight;
        const x = rtl ? this.innerWidth - width - 4 : 4;
        this.drawFace(faceName, faceIndex, x, 0, width, height);
    }
    processControlCharacter(textState, c) {
        Window_Base.prototype.processControlCharacter.call(this, textState, c);
        if (c === "\f") {
            this.processNewPage(textState);
        }
    }
    processNewLine(textState) {
        this._lineShowFast = false;
        Window_Base.prototype.processNewLine.call(this, textState);
        if (this.needsNewPage(textState)) {
            this.startPause();
        }
    }
    processNewPage(textState) {
        if (textState.text[textState.index] === "\n") {
            textState.index++;
        }
        textState.y = this.contents.height;
        this.startPause();
    }
    isEndOfText(textState) {
        return textState.index >= textState.text.length;
    }
    needsNewPage(textState) {
        return (
            !this.isEndOfText(textState) &&
            textState.y + textState.height > this.contents.height
        );
    }
    processEscapeCharacter(code, textState) {
        switch (code) {
            case "$":
                this._goldWindow.open();
                break;
            case ".":
                this.startWait(15);
                break;
            case "|":
                this.startWait(60);
                break;
            case "!":
                this.startPause();
                break;
            case ">":
                this._lineShowFast = true;
                break;
            case "<":
                this._lineShowFast = false;
                break;
            case "^":
                this._pauseSkip = true;
                break;
            default:
                Window_Base.prototype.processEscapeCharacter.call(
                    this,
                    code,
                    textState
                );
                break;
        }
    }
    startWait(count) {
        this._waitCount = count;
    }
    startPause() {
        this.startWait(10);
        this.pause = true;
    }
    isWaiting() {
        return this.pause || this._waitCount > 0;
    }
}
//-----------------------------------------------------------------------------
// Window_ScrollText
//
// The window for displaying scrolling text. No frame is displayed, but it
// is handled as a window for convenience.

class Window_ScrollText extends Window_Base {
    initialize(rect) {
        Window_Base.prototype.initialize.call(this, new Rectangle());
        this.opacity = 0;
        this.hide();
        this._reservedRect = rect;
        this._text = "";
        this._maxBitmapHeight = 2048;
        this._allTextHeight = 0;
        this._blockHeight = 0;
        this._blockIndex = 0;
        this._scrollY = 0;
    }
    update() {
        Window_Base.prototype.update.call(this);
        if ($gameMessage.scrollMode()) {
            if (this._text) {
                this.updateMessage();
            }
            if (!this._text && $gameMessage.hasText()) {
                this.startMessage();
            }
        }
    }
    startMessage() {
        this._text = $gameMessage.allText();
        if (this._text) {
            this.updatePlacement();
            this._allTextHeight = this.textSizeEx(this._text).height;
            this._blockHeight = this._maxBitmapHeight - this.height;
            this._blockIndex = 0;
            this.origin.y = this._scrollY = -this.height;
            this.createContents();
            this.refresh();
            this.show();
        } else {
            $gameMessage.clear();
        }
    }
    refresh() {
        const rect = this.baseTextRect();
        const y = rect.y - this._scrollY + (this._scrollY % this._blockHeight);
        this.contents.clear();
        this.drawTextEx(this._text, rect.x, y, rect.width);
    }
    updatePlacement() {
        const rect = this._reservedRect;
        this.move(rect.x, rect.y, rect.width, rect.height);
    }
    contentsHeight() {
        if (this._allTextHeight > 0) {
            return Math.min(this._allTextHeight, this._maxBitmapHeight);
        } else {
            return 0;
        }
    }
    updateMessage() {
        this._scrollY += this.scrollSpeed();
        if (this._scrollY >= this._allTextHeight) {
            this.terminateMessage();
        } else {
            const blockIndex = Math.floor(this._scrollY / this._blockHeight);
            if (blockIndex > this._blockIndex) {
                this._blockIndex = blockIndex;
                this.refresh();
            }
            this.origin.y = this._scrollY % this._blockHeight;
        }
    }
    scrollSpeed() {
        let speed = $gameMessage.scrollSpeed() / 2;
        if (this.isFastForward()) {
            speed *= this.fastForwardRate();
        }
        return speed;
    }
    isFastForward() {
        if ($gameMessage.scrollNoFast()) {
            return false;
        } else {
            return (
                Input.isPressed("ok") ||
                Input.isPressed("shift") ||
                TouchInput.isPressed()
            );
        }
    }
    fastForwardRate() {
        return 3;
    }
    terminateMessage() {
        this._text = null;
        $gameMessage.clear();
        this.hide();
    }
}
//-----------------------------------------------------------------------------
// Window_MapName
//
// The window for displaying the map name on the map screen.

class Window_MapName extends Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this.opacity = 0;
        this.contentsOpacity = 0;
        this._showCount = 0;
        this.refresh();
    }
    update() {
        Window_Base.prototype.update.call(this);
        if (this._showCount > 0 && $gameMap.isNameDisplayEnabled()) {
            this._showCount--;
        } else {
            this.close();
        }
    }
    updateFadeIn() {
        this.contentsOpacity += 16;
    }
    updateFadeOut() {
        this.contentsOpacity -= 16;
    }
    open() {
        this.refresh();
        this._showCount = 150;
    }
    close() {
        this._showCount = 0;
    }
    refresh() {
        this.contents.clear();
        if ($gameMap.displayName()) {
            const width = this.innerWidth;
            this.drawBackground(0, 0, width, this.lineHeight());
            this.drawText($gameMap.displayName(), 0, 0, width, "center");
        }
    }
    drawBackground(x, y, width, height) {
        const color1 = ColorManager.dimColor1();
        const color2 = ColorManager.dimColor2();
        const half = width / 2;
        this.contents.gradientFillRect(x, y, half, height, color2, color1);
        this.contents.gradientFillRect(x + half, y, half, height, color1, color2);
    }
}
//-----------------------------------------------------------------------------
// Window_BattleLog
//
// The window for displaying battle progress. No frame is displayed, but it is
// handled as a window for convenience.

class Window_BattleLog extends Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this.opacity = 0;
        this._lines = [];
        this._methods = [];
        this._waitCount = 0;
        this._waitMode = "";
        this._baseLineStack = [];
        this._spriteset = null;
        this.refresh();
    }
    setSpriteset(spriteset) {
        this._spriteset = spriteset;
    }
    maxLines() {
        return 10;
    }
    numLines() {
        return this._lines.length;
    }
    messageSpeed() {
        return 16;
    }
    isBusy() {
        return this._waitCount > 0 || this._waitMode || this._methods.length > 0;
    }
    update() {
        if (!this.updateWait()) {
            this.callNextMethod();
        }
    }
    updateWait() {
        return this.updateWaitCount() || this.updateWaitMode();
    }
    updateWaitCount() {
        if (this._waitCount > 0) {
            this._waitCount -= this.isFastForward() ? 3 : 1;
            if (this._waitCount < 0) {
                this._waitCount = 0;
            }
            return true;
        }
        return false;
    }
    updateWaitMode() {
        let waiting = false;
        switch (this._waitMode) {
            case "effect":
                waiting = this._spriteset.isEffecting();
                break;
            case "movement":
                waiting = this._spriteset.isAnyoneMoving();
                break;
        }
        if (!waiting) {
            this._waitMode = "";
        }
        return waiting;
    }
    setWaitMode(waitMode) {
        this._waitMode = waitMode;
    }
    callNextMethod() {
        if (this._methods.length > 0) {
            const method = this._methods.shift();
            if (method.name && this[method.name]) {
                this[method.name].apply(this, method.params);
            } else {
                throw new Error("Method not found: " + method.name);
            }
        }
    }
    isFastForward() {
        return (
            Input.isLongPressed("ok") ||
            Input.isPressed("shift") ||
            TouchInput.isLongPressed()
        );
    }
    push(methodName) {
        const methodArgs = Array.prototype.slice.call(arguments, 1);
        this._methods.push({ name: methodName, params: methodArgs });
    }
    clear() {
        this._lines = [];
        this._baseLineStack = [];
        this.refresh();
    }
    wait() {
        this._waitCount = this.messageSpeed();
    }
    waitForEffect() {
        this.setWaitMode("effect");
    }
    waitForMovement() {
        this.setWaitMode("movement");
    }
    addText(text) {
        this._lines.push(text);
        this.refresh();
        this.wait();
    }
    pushBaseLine() {
        this._baseLineStack.push(this._lines.length);
    }
    popBaseLine() {
        const baseLine = this._baseLineStack.pop();
        while (this._lines.length > baseLine) {
            this._lines.pop();
        }
    }
    waitForNewLine() {
        let baseLine = 0;
        if (this._baseLineStack.length > 0) {
            baseLine = this._baseLineStack[this._baseLineStack.length - 1];
        }
        if (this._lines.length > baseLine) {
            this.wait();
        }
    }
    popupDamage(target) {
        if (target.shouldPopupDamage()) {
            target.startDamagePopup();
        }
    }
    performActionStart(subject, action) {
        subject.performActionStart(action);
    }
    performAction(subject, action) {
        subject.performAction(action);
    }
    performActionEnd(subject) {
        subject.performActionEnd();
    }
    performDamage(target) {
        target.performDamage();
    }
    performMiss(target) {
        target.performMiss();
    }
    performRecovery(target) {
        target.performRecovery();
    }
    performEvasion(target) {
        target.performEvasion();
    }
    performMagicEvasion(target) {
        target.performMagicEvasion();
    }
    performCounter(target) {
        target.performCounter();
    }
    performReflection(target) {
        target.performReflection();
    }
    performSubstitute(substitute, target) {
        substitute.performSubstitute(target);
    }
    performCollapse(target) {
        target.performCollapse();
    }
    // prettier-ignore
    showAnimation(subject, targets, animationId) {
        if (animationId < 0) {
            this.showAttackAnimation(subject, targets);
        } else {
            this.showNormalAnimation(targets, animationId);
        }
    }
    showAttackAnimation(subject, targets) {
        if (subject.isActor()) {
            this.showActorAttackAnimation(subject, targets);
        } else {
            this.showEnemyAttackAnimation(subject, targets);
        }
    }
    // prettier-ignore
    showActorAttackAnimation(subject, targets) {
        this.showNormalAnimation(targets, subject.attackAnimationId1(), false);
        this.showNormalAnimation(targets, subject.attackAnimationId2(), true);
    }
    // prettier-ignore
    showEnemyAttackAnimation(
        /* subject, targets */
    ) {
        SoundManager.playEnemyAttack();
    }
    // prettier-ignore
    showNormalAnimation(targets, animationId, mirror) {
        const animation = $dataAnimations[animationId];
        if (animation) {
            $gameTemp.requestAnimation(targets, animationId, mirror);
        }
    }
    refresh() {
        this.drawBackground();
        this.contents.clear();
        for (let i = 0; i < this._lines.length; i++) {
            this.drawLineText(i);
        }
    }
    drawBackground() {
        const rect = this.backRect();
        const color = this.backColor();
        this.contentsBack.clear();
        this.contentsBack.paintOpacity = this.backPaintOpacity();
        this.contentsBack.fillRect(rect.x, rect.y, rect.width, rect.height, color);
        this.contentsBack.paintOpacity = 255;
    }
    backRect() {
        const height = this.numLines() * this.itemHeight();
        return new Rectangle(0, 0, this.innerWidth, height);
    }
    lineRect(index) {
        const itemHeight = this.itemHeight();
        const padding = this.itemPadding();
        const x = padding;
        const y = index * itemHeight;
        const width = this.innerWidth - padding * 2;
        const height = itemHeight;
        return new Rectangle(x, y, width, height);
    }
    backColor() {
        return "#000000";
    }
    backPaintOpacity() {
        return 64;
    }
    drawLineText(index) {
        const rect = this.lineRect(index);
        this.contents.clearRect(rect.x, rect.y, rect.width, rect.height);
        this.drawTextEx(this._lines[index], rect.x, rect.y, rect.width);
    }
    startTurn() {
        this.push("wait");
    }
    startAction(subject, action, targets) {
        const item = action.item();
        this.push("performActionStart", subject, action);
        this.push("waitForMovement");
        this.push("performAction", subject, action);
        this.push("showAnimation", subject, targets.clone(), item.animationId);
        this.displayAction(subject, item);
    }
    endAction(subject) {
        this.push("waitForNewLine");
        this.push("clear");
        this.push("performActionEnd", subject);
    }
    displayCurrentState(subject) {
        const stateText = subject.mostImportantStateText();
        if (stateText) {
            this.push("addText", stateText.format(subject.name()));
            this.push("wait");
            this.push("clear");
        }
    }
    displayRegeneration(subject) {
        this.push("popupDamage", subject);
    }
    displayAction(subject, item) {
        const numMethods = this._methods.length;
        if (DataManager.isSkill(item)) {
            this.displayItemMessage(item.message1, subject, item);
            this.displayItemMessage(item.message2, subject, item);
        } else {
            this.displayItemMessage(TextManager.useItem, subject, item);
        }
        if (this._methods.length === numMethods) {
            this.push("wait");
        }
    }
    displayItemMessage(fmt, subject, item) {
        if (fmt) {
            this.push("addText", fmt.format(subject.name(), item.name));
        }
    }
    displayCounter(target) {
        this.push("performCounter", target);
        this.push("addText", TextManager.counterAttack.format(target.name()));
    }
    displayReflection(target) {
        this.push("performReflection", target);
        this.push("addText", TextManager.magicReflection.format(target.name()));
    }
    displaySubstitute(substitute, target) {
        const substName = substitute.name();
        const text = TextManager.substitute.format(substName, target.name());
        this.push("performSubstitute", substitute, target);
        this.push("addText", text);
    }
    displayActionResults(subject, target) {
        if (target.result().used) {
            this.push("pushBaseLine");
            this.displayCritical(target);
            this.push("popupDamage", target);
            this.push("popupDamage", subject);
            this.displayDamage(target);
            this.displayAffectedStatus(target);
            this.displayFailure(target);
            this.push("waitForNewLine");
            this.push("popBaseLine");
        }
    }
    displayFailure(target) {
        if (target.result().isHit() && !target.result().success) {
            this.push("addText", TextManager.actionFailure.format(target.name()));
        }
    }
    displayCritical(target) {
        if (target.result().critical) {
            if (target.isActor()) {
                this.push("addText", TextManager.criticalToActor);
            } else {
                this.push("addText", TextManager.criticalToEnemy);
            }
        }
    }
    displayDamage(target) {
        if (target.result().missed) {
            this.displayMiss(target);
        } else if (target.result().evaded) {
            this.displayEvasion(target);
        } else {
            this.displayHpDamage(target);
            this.displayMpDamage(target);
            this.displayTpDamage(target);
        }
    }
    displayMiss(target) {
        let fmt;
        if (target.result().physical) {
            const isActor = target.isActor();
            fmt = isActor ? TextManager.actorNoHit : TextManager.enemyNoHit;
            this.push("performMiss", target);
        } else {
            fmt = TextManager.actionFailure;
        }
        this.push("addText", fmt.format(target.name()));
    }
    displayEvasion(target) {
        let fmt;
        if (target.result().physical) {
            fmt = TextManager.evasion;
            this.push("performEvasion", target);
        } else {
            fmt = TextManager.magicEvasion;
            this.push("performMagicEvasion", target);
        }
        this.push("addText", fmt.format(target.name()));
    }
    displayHpDamage(target) {
        if (target.result().hpAffected) {
            if (target.result().hpDamage > 0 && !target.result().drain) {
                this.push("performDamage", target);
            }
            if (target.result().hpDamage < 0) {
                this.push("performRecovery", target);
            }
            this.push("addText", this.makeHpDamageText(target));
        }
    }
    displayMpDamage(target) {
        if (target.isAlive() && target.result().mpDamage !== 0) {
            if (target.result().mpDamage < 0) {
                this.push("performRecovery", target);
            }
            this.push("addText", this.makeMpDamageText(target));
        }
    }
    displayTpDamage(target) {
        if (target.isAlive() && target.result().tpDamage !== 0) {
            if (target.result().tpDamage < 0) {
                this.push("performRecovery", target);
            }
            this.push("addText", this.makeTpDamageText(target));
        }
    }
    displayAffectedStatus(target) {
        if (target.result().isStatusAffected()) {
            this.push("pushBaseLine");
            this.displayChangedStates(target);
            this.displayChangedBuffs(target);
            this.push("waitForNewLine");
            this.push("popBaseLine");
        }
    }
    displayAutoAffectedStatus(target) {
        if (target.result().isStatusAffected()) {
            this.displayAffectedStatus(target, null);
            this.push("clear");
        }
    }
    displayChangedStates(target) {
        this.displayAddedStates(target);
        this.displayRemovedStates(target);
    }
    displayAddedStates(target) {
        const result = target.result();
        const states = result.addedStateObjects();
        for (const state of states) {
            const stateText = target.isActor() ? state.message1 : state.message2;
            if (state.id === target.deathStateId()) {
                this.push("performCollapse", target);
            }
            if (stateText) {
                this.push("popBaseLine");
                this.push("pushBaseLine");
                this.push("addText", stateText.format(target.name()));
                this.push("waitForEffect");
            }
        }
    }
    displayRemovedStates(target) {
        const result = target.result();
        const states = result.removedStateObjects();
        for (const state of states) {
            if (state.message4) {
                this.push("popBaseLine");
                this.push("pushBaseLine");
                this.push("addText", state.message4.format(target.name()));
            }
        }
    }
    displayChangedBuffs(target) {
        const result = target.result();
        this.displayBuffs(target, result.addedBuffs, TextManager.buffAdd);
        this.displayBuffs(target, result.addedDebuffs, TextManager.debuffAdd);
        this.displayBuffs(target, result.removedBuffs, TextManager.buffRemove);
    }
    displayBuffs(target, buffs, fmt) {
        for (const paramId of buffs) {
            const text = fmt.format(target.name(), TextManager.param(paramId));
            this.push("popBaseLine");
            this.push("pushBaseLine");
            this.push("addText", text);
        }
    }
    makeHpDamageText(target) {
        const result = target.result();
        const damage = result.hpDamage;
        const isActor = target.isActor();
        let fmt;
        if (damage > 0 && result.drain) {
            fmt = isActor ? TextManager.actorDrain : TextManager.enemyDrain;
            return fmt.format(target.name(), TextManager.hp, damage);
        } else if (damage > 0) {
            fmt = isActor ? TextManager.actorDamage : TextManager.enemyDamage;
            return fmt.format(target.name(), damage);
        } else if (damage < 0) {
            fmt = isActor ? TextManager.actorRecovery : TextManager.enemyRecovery;
            return fmt.format(target.name(), TextManager.hp, -damage);
        } else {
            fmt = isActor ? TextManager.actorNoDamage : TextManager.enemyNoDamage;
            return fmt.format(target.name());
        }
    }
    makeMpDamageText(target) {
        const result = target.result();
        const damage = result.mpDamage;
        const isActor = target.isActor();
        let fmt;
        if (damage > 0 && result.drain) {
            fmt = isActor ? TextManager.actorDrain : TextManager.enemyDrain;
            return fmt.format(target.name(), TextManager.mp, damage);
        } else if (damage > 0) {
            fmt = isActor ? TextManager.actorLoss : TextManager.enemyLoss;
            return fmt.format(target.name(), TextManager.mp, damage);
        } else if (damage < 0) {
            fmt = isActor ? TextManager.actorRecovery : TextManager.enemyRecovery;
            return fmt.format(target.name(), TextManager.mp, -damage);
        } else {
            return "";
        }
    }
    makeTpDamageText(target) {
        const result = target.result();
        const damage = result.tpDamage;
        const isActor = target.isActor();
        let fmt;
        if (damage > 0) {
            fmt = isActor ? TextManager.actorLoss : TextManager.enemyLoss;
            return fmt.format(target.name(), TextManager.tp, damage);
        } else if (damage < 0) {
            fmt = isActor ? TextManager.actorGain : TextManager.enemyGain;
            return fmt.format(target.name(), TextManager.tp, -damage);
        } else {
            return "";
        }
    }
}
//-----------------------------------------------------------------------------
// Window_PartyCommand
//
// The window for selecting whether to fight or escape on the battle screen.

class Window_PartyCommand extends Window_Command {
    initialize(rect) {
        super.initialize(rect);
        this.openness = 0;
        this.deactivate();
    }
    makeCommandList() {
        this.addCommand(TextManager.fight, "fight");
        this.addCommand(TextManager.escape, "escape", BattleManager.canEscape());
    }
    setup() {
        this.refresh();
        this.forceSelect(0);
        this.activate();
        this.open();
    }
}
//-----------------------------------------------------------------------------
// Window_ActorCommand
//
// The window for selecting an actor's action on the battle screen.

class Window_ActorCommand extends Window_Command {
    initialize(rect) {
        super.initialize(rect);
        this.openness = 0;
        this.deactivate();
        this._actor = null;
    }
    makeCommandList() {
        if (this._actor) {
            this.addAttackCommand();
            this.addSkillCommands();
            this.addGuardCommand();
            this.addItemCommand();
        }
    }
    addAttackCommand() {
        this.addCommand(TextManager.attack, "attack", this._actor.canAttack());
    }
    addSkillCommands() {
        const skillTypes = this._actor.skillTypes();
        for (const stypeId of skillTypes) {
            const name = $dataSystem.skillTypes[stypeId];
            this.addCommand(name, "skill", true, stypeId);
        }
    }
    addGuardCommand() {
        this.addCommand(TextManager.guard, "guard", this._actor.canGuard());
    }
    addItemCommand() {
        this.addCommand(TextManager.item, "item");
    }
    setup(actor) {
        this._actor = actor;
        this.refresh();
        this.selectLast();
        this.activate();
        this.open();
    }
    actor() {
        return this._actor;
    }
    processOk() {
        if (this._actor) {
            if (ConfigManager.commandRemember) {
                this._actor.setLastCommandSymbol(this.currentSymbol());
            } else {
                this._actor.setLastCommandSymbol("");
            }
        }
        Window_Command.prototype.processOk.call(this);
    }
    selectLast() {
        this.forceSelect(0);
        if (this._actor && ConfigManager.commandRemember) {
            const symbol = this._actor.lastCommandSymbol();
            this.selectSymbol(symbol);
            if (symbol === "skill") {
                const skill = this._actor.lastBattleSkill();
                if (skill) {
                    this.selectExt(skill.stypeId);
                }
            }
        }
    }
}
//-----------------------------------------------------------------------------
// Window_BattleStatus
//
// The window for displaying the status of party members on the battle screen.

class Window_BattleStatus extends Window_StatusBase {
    initialize(rect) {
        super.initialize(rect);
        this.frameVisible = false;
        this.openness = 0;
        this._bitmapsReady = 0;
        this.preparePartyRefresh();
    }
    extraHeight() {
        return 10;
    }
    maxCols() {
        return 4;
    }
    itemHeight() {
        return this.innerHeight;
    }
    maxItems() {
        return $gameParty.battleMembers().length;
    }
    rowSpacing() {
        return 0;
    }
    updatePadding() {
        this.padding = 8;
    }
    actor(index) {
        return $gameParty.battleMembers()[index];
    }
    selectActor(actor) {
        const members = $gameParty.battleMembers();
        this.select(members.indexOf(actor));
    }
    update() {
        Window_StatusBase.prototype.update.call(this);
        if ($gameTemp.isBattleRefreshRequested()) {
            this.preparePartyRefresh();
        }
    }
    preparePartyRefresh() {
        $gameTemp.clearBattleRefreshRequest();
        this._bitmapsReady = 0;
        for (const actor of $gameParty.members()) {
            const bitmap = ImageManager.loadFace(actor.faceName());
            bitmap.addLoadListener(this.performPartyRefresh.bind(this));
        }
    }
    performPartyRefresh() {
        this._bitmapsReady++;
        if (this._bitmapsReady >= $gameParty.members().length) {
            this.refresh();
        }
    }
    drawItem(index) {
        this.drawItemImage(index);
        this.drawItemStatus(index);
    }
    drawItemImage(index) {
        const actor = this.actor(index);
        const rect = this.faceRect(index);
        this.drawActorFace(actor, rect.x, rect.y, rect.width, rect.height);
    }
    drawItemStatus(index) {
        const actor = this.actor(index);
        const rect = this.itemRectWithPadding(index);
        const nameX = this.nameX(rect);
        const nameY = this.nameY(rect);
        const stateIconX = this.stateIconX(rect);
        const stateIconY = this.stateIconY(rect);
        const basicGaugesX = this.basicGaugesX(rect);
        const basicGaugesY = this.basicGaugesY(rect);
        this.placeTimeGauge(actor, nameX, nameY);
        this.placeActorName(actor, nameX, nameY);
        this.placeStateIcon(actor, stateIconX, stateIconY);
        this.placeBasicGauges(actor, basicGaugesX, basicGaugesY);
    }
    faceRect(index) {
        const rect = this.itemRect(index);
        rect.pad(-1);
        rect.height = this.nameY(rect) + this.gaugeLineHeight() / 2 - rect.y;
        return rect;
    }
    nameX(rect) {
        return rect.x;
    }
    nameY(rect) {
        return this.basicGaugesY(rect) - this.gaugeLineHeight();
    }
    stateIconX(rect) {
        return rect.x + rect.width - ImageManager.iconWidth / 2 + 4;
    }
    stateIconY(rect) {
        return rect.y + ImageManager.iconHeight / 2 + 4;
    }
    basicGaugesX(rect) {
        return rect.x;
    }
    basicGaugesY(rect) {
        const bottom = rect.y + rect.height - this.extraHeight();
        const numGauges = $dataSystem.optDisplayTp ? 3 : 2;
        return bottom - this.gaugeLineHeight() * numGauges;
    }
}
//-----------------------------------------------------------------------------
// Window_BattleActor
//
// The window for selecting a target actor on the battle screen.

class Window_BattleActor extends Window_BattleStatus {
    initialize(rect) {
        super.initialize(rect);
        this.openness = 255;
        this.hide();
    }
    show() {
        this.forceSelect(0);
        $gameTemp.clearTouchState();
        Window_BattleStatus.prototype.show.call(this);
    }
    hide() {
        Window_BattleStatus.prototype.hide.call(this);
        $gameParty.select(null);
    }
    select(index) {
        Window_BattleStatus.prototype.select.call(this, index);
        $gameParty.select(this.actor(index));
    }
    processTouch() {
        Window_BattleStatus.prototype.processTouch.call(this);
        if (this.isOpenAndActive()) {
            const target = $gameTemp.touchTarget();
            if (target) {
                const members = $gameParty.battleMembers();
                if (members.includes(target)) {
                    this.select(members.indexOf(target));
                    if ($gameTemp.touchState() === "click") {
                        this.processOk();
                    }
                }
                $gameTemp.clearTouchState();
            }
        }
    }
}
//-----------------------------------------------------------------------------
// Window_BattleEnemy
//
// The window for selecting a target enemy on the battle screen.

class Window_BattleEnemy extends Window_Selectable {
    initialize(rect) {
        this._enemies = [];
        super.initialize(rect);
        this.refresh();
        this.hide();
    }
    maxCols() {
        return 2;
    }
    maxItems() {
        return this._enemies.length;
    }
    enemy() {
        return this._enemies[this.index()];
    }
    enemyIndex() {
        const enemy = this.enemy();
        return enemy ? enemy.index() : -1;
    }
    drawItem(index) {
        this.resetTextColor();
        const name = this._enemies[index].name();
        const rect = this.itemLineRect(index);
        this.drawText(name, rect.x, rect.y, rect.width);
    }
    show() {
        this.refresh();
        this.forceSelect(0);
        $gameTemp.clearTouchState();
        Window_Selectable.prototype.show.call(this);
    }
    hide() {
        Window_Selectable.prototype.hide.call(this);
        $gameTroop.select(null);
    }
    refresh() {
        this._enemies = $gameTroop.aliveMembers();
        Window_Selectable.prototype.refresh.call(this);
    }
    select(index) {
        Window_Selectable.prototype.select.call(this, index);
        $gameTroop.select(this.enemy());
    }
    processTouch() {
        Window_Selectable.prototype.processTouch.call(this);
        if (this.isOpenAndActive()) {
            const target = $gameTemp.touchTarget();
            if (target) {
                if (this._enemies.includes(target)) {
                    this.select(this._enemies.indexOf(target));
                    if ($gameTemp.touchState() === "click") {
                        this.processOk();
                    }
                }
                $gameTemp.clearTouchState();
            }
        }
    }
}
//-----------------------------------------------------------------------------
// Window_BattleSkill
//
// The window for selecting a skill to use on the battle screen.

class Window_BattleSkill extends Window_SkillList {
    initialize(rect) {
        super.initialize(rect);
        this.hide();
    }
    show() {
        this.selectLast();
        this.showHelpWindow();
        Window_SkillList.prototype.show.call(this);
    }
    hide() {
        this.hideHelpWindow();
        Window_SkillList.prototype.hide.call(this);
    }
}
//-----------------------------------------------------------------------------
// Window_BattleItem
//
// The window for selecting an item to use on the battle screen.

class Window_BattleItem extends Window_ItemList {
    initialize(rect) {
        super.initialize(rect);
        this.hide();
    }
    includes(item) {
        return $gameParty.canUse(item);
    }
    show() {
        this.selectLast();
        this.showHelpWindow();
        Window_ItemList.prototype.show.call(this);
    }
    hide() {
        this.hideHelpWindow();
        Window_ItemList.prototype.hide.call(this);
    }
}
//-----------------------------------------------------------------------------
// Window_TitleCommand
//
// The window for selecting New Game/Continue on the title screen.

class Window_TitleCommand extends Window_Command {
    static initCommandPosition() {
        this._lastCommandSymbol = null;
    }
    initialize(rect) {
        super.initialize(rect);
        this.openness = 0;
        this.selectLast();
    }
    makeCommandList() {
        const continueEnabled = this.isContinueEnabled();
        this.addCommand(TextManager.newGame, "newGame");
        this.addCommand(TextManager.continue_, "continue", continueEnabled);
        this.addCommand(TextManager.options, "options");
    }
    isContinueEnabled() {
        return DataManager.isAnySavefileExists();
    }
    processOk() {
        Window_TitleCommand._lastCommandSymbol = this.currentSymbol();
        Window_Command.prototype.processOk.call(this);
    }
    selectLast() {
        if (Window_TitleCommand._lastCommandSymbol) {
            this.selectSymbol(Window_TitleCommand._lastCommandSymbol);
        } else if (this.isContinueEnabled()) {
            this.selectSymbol("continue");
        }
    }
}
//-----------------------------------------------------------------------------
// Window_GameEnd
//
// The window for selecting "Go to Title" on the game end screen.

class Window_GameEnd extends Window_Command {
    initialize(rect) {
        super.initialize(rect);
        this.openness = 0;
        this.open();
    }
    makeCommandList() {
        this.addCommand(TextManager.toTitle, "toTitle");
        this.addCommand(TextManager.cancel, "cancel");
    }
}
//-----------------------------------------------------------------------------
// Window_DebugRange
//
// The window for selecting a block of switches/variables on the debug screen.

class Window_DebugRange extends Window_Selectable {
    static lastTopRow = 0;
    static lastIndex = 0;
    initialize(rect) {
        this._maxSwitches = Math.ceil(($dataSystem.switches.length - 1) / 10);
        this._maxVariables = Math.ceil(($dataSystem.variables.length - 1) / 10);
        super.initialize(rect);
        this.refresh();
        this.setTopRow(Window_DebugRange.lastTopRow);
        this.select(Window_DebugRange.lastIndex);
        this.activate();
    }
    maxItems() {
        return this._maxSwitches + this._maxVariables;
    }
    update() {
        Window_Selectable.prototype.update.call(this);
        if (this._editWindow) {
            const index = this.index();
            this._editWindow.setMode(this.mode(index));
            this._editWindow.setTopId(this.topId(index));
        }
    }
    mode(index) {
        return this.isSwitchMode(index) ? "switch" : "variable";
    }
    topId(index) {
        if (this.isSwitchMode(index)) {
            return index * 10 + 1;
        } else {
            return (index - this._maxSwitches) * 10 + 1;
        }
    }
    isSwitchMode(index) {
        return index < this._maxSwitches;
    }
    drawItem(index) {
        const rect = this.itemLineRect(index);
        const c = this.isSwitchMode(index) ? "S" : "V";
        const start = this.topId(index);
        const end = start + 9;
        const text = c + " [" + start.padZero(4) + "-" + end.padZero(4) + "]";
        this.drawText(text, rect.x, rect.y, rect.width);
    }
    isCancelTriggered() {
        return (
            Window_Selectable.prototype.isCancelTriggered() ||
            Input.isTriggered("debug")
        );
    }
    processCancel() {
        Window_Selectable.prototype.processCancel.call(this);
        Window_DebugRange.lastTopRow = this.topRow();
        Window_DebugRange.lastIndex = this.index();
    }
    setEditWindow(editWindow) {
        this._editWindow = editWindow;
    }
}

//-----------------------------------------------------------------------------
// Window_DebugEdit
//
// The window for displaying switches and variables on the debug screen.

class Window_DebugEdit extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._mode = "switch";
        this._topId = 1;
        this.refresh();
    }
    maxItems() {
        return 10;
    }
    drawItem(index) {
        const dataId = this._topId + index;
        const idText = dataId.padZero(4) + ":";
        const idWidth = this.textWidth(idText);
        const statusWidth = this.textWidth("-00000000");
        const name = this.itemName(dataId);
        const status = this.itemStatus(dataId);
        const rect = this.itemLineRect(index);
        this.resetTextColor();
        this.drawText(idText, rect.x, rect.y, rect.width);
        rect.x += idWidth;
        rect.width -= idWidth + statusWidth;
        this.drawText(name, rect.x, rect.y, rect.width);
        this.drawText(status, rect.x + rect.width, rect.y, statusWidth, "right");
    }
    itemName(dataId) {
        if (this._mode === "switch") {
            return $dataSystem.switches[dataId];
        } else {
            return $dataSystem.variables[dataId];
        }
    }
    itemStatus(dataId) {
        if (this._mode === "switch") {
            return $gameSwitches.value(dataId) ? "[ON]" : "[OFF]";
        } else {
            return String($gameVariables.value(dataId));
        }
    }
    setMode(mode) {
        if (this._mode !== mode) {
            this._mode = mode;
            this.refresh();
        }
    }
    setTopId(id) {
        if (this._topId !== id) {
            this._topId = id;
            this.refresh();
        }
    }
    currentId() {
        return this._topId + this.index();
    }
    update() {
        Window_Selectable.prototype.update.call(this);
        if (this.active) {
            if (this._mode === "switch") {
                this.updateSwitch();
            } else {
                this.updateVariable();
            }
        }
    }
    updateSwitch() {
        if (Input.isRepeated("ok")) {
            const switchId = this.currentId();
            this.playCursorSound();
            $gameSwitches.setValue(switchId, !$gameSwitches.value(switchId));
            this.redrawCurrentItem();
        }
    }
    updateVariable() {
        const variableId = this.currentId();
        const value = $gameVariables.value(variableId);
        if (typeof value === "number") {
            const newValue = value + this.deltaForVariable();
            if (value !== newValue) {
                $gameVariables.setValue(variableId, newValue);
                this.playCursorSound();
                this.redrawCurrentItem();
            }
        }
    }
    deltaForVariable() {
        if (Input.isRepeated("right")) {
            return 1;
        } else if (Input.isRepeated("left")) {
            return -1;
        } else if (Input.isRepeated("pagedown")) {
            return 10;
        } else if (Input.isRepeated("pageup")) {
            return -10;
        }
        return 0;
    }
}