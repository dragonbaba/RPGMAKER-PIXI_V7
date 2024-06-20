//=============================================================================
// rmmz_sprites.js v1.8.0
//=============================================================================

//-----------------------------------------------------------------------------
// Sprite_Clickable
//
// The sprite class with click handling functions.

class Sprite_Clickable extends Sprite {
    initialize(..._args) {
        super.initialize();
        this._pressed = false;
        this._hovered = false;
    }
    update() {
        super.update();
        this.processTouch();
    }
    processTouch() {
        if (this.isClickEnabled()) {
            if (this.isBeingTouched()) {
                if (!this._hovered && TouchInput.isHovered()) {
                    this._hovered = true;
                    this.onMouseEnter();
                }
                if (TouchInput.isTriggered()) {
                    this._pressed = true;
                    this.onPress();
                }
            } else {
                if (this._hovered) {
                    this.onMouseExit();
                }
                this._pressed = false;
                this._hovered = false;
            }
            if (this._pressed && TouchInput.isReleased()) {
                this._pressed = false;
                this.onClick();
            }
        } else {
            this._pressed = false;
            this._hovered = false;
        }
    }
    isPressed() {
        return this._pressed;
    }
    isClickEnabled() {
        return this.worldVisible;
    }
    isBeingTouched() {
        const touchPos = new Point(TouchInput.x, TouchInput.y);
        const localPos = this.worldTransform.applyInverse(touchPos);
        return this.hitTest(localPos.x, localPos.y);
    }
    hitTest(x, y) {
        const rect = new Rectangle(
            -this.anchor.x * this.width,
            -this.anchor.y * this.height,
            this.width,
            this.height
        );
        return rect.contains(x, y);
    }
    onMouseEnter() {
        //
    }
    onMouseExit() {
        //
    }
    onPress() {
        //
    }
    onClick() {
        //
    }
}
//-----------------------------------------------------------------------------
// Sprite_Button
//
// The sprite for displaying a button.

class Sprite_Button extends Sprite_Clickable {
    initialize(buttonType) {
        super.initialize()
        this._buttonType = buttonType;
        this._clickHandler = null;
        this._coldFrame = null;
        this._hotFrame = null;
        this.setupFrames();
    }
    setupFrames() {
        const data = this.buttonData();
        const x = data.x * this.blockWidth();
        const width = data.w * this.blockWidth();
        const height = this.blockHeight();
        this.loadButtonImage();
        this.setColdFrame(x, 0, width, height);
        this.setHotFrame(x, height, width, height);
        this.updateFrame();
        this.updateOpacity();
    }
    blockWidth() {
        return 48;
    }
    blockHeight() {
        return 48;
    }
    loadButtonImage() {
        this.bitmap = ImageManager.loadSystem("ButtonSet");
    }
    buttonData() {
        const buttonTable = {
            cancel: { x: 0, w: 2 },
            pageup: { x: 2, w: 1 },
            pagedown: { x: 3, w: 1 },
            down: { x: 4, w: 1 },
            up: { x: 5, w: 1 },
            down2: { x: 6, w: 1 },
            up2: { x: 7, w: 1 },
            ok: { x: 8, w: 2 },
            menu: { x: 10, w: 1 }
        };
        return buttonTable[this._buttonType];
    }
    update() {
        Sprite_Clickable.prototype.update.call(this);
        this.checkBitmap();
        this.updateFrame();
        this.updateOpacity();
        this.processTouch();
    }
    checkBitmap() {
        if (this.bitmap.isReady() && this.bitmap.width < this.blockWidth() * 11) {
            // Probably MV image is used
            throw new Error("ButtonSet image is too small");
        }
    }
    updateFrame() {
        const frame = this.isPressed() ? this._hotFrame : this._coldFrame;
        if (frame) {
            this.setFrame(frame.x, frame.y, frame.width, frame.height);
        }
    }
    updateOpacity() {
        this.opacity = this._pressed ? 255 : 192;
    }
    setColdFrame(x, y, width, height) {
        this._coldFrame = new Rectangle(x, y, width, height);
    }
    setHotFrame(x, y, width, height) {
        this._hotFrame = new Rectangle(x, y, width, height);
    }
    setClickHandler(method) {
        this._clickHandler = method;
    }
    onClick() {
        if (this._clickHandler) {
            this._clickHandler();
        } else {
            Input.virtualClick(this._buttonType);
        }
    }
}
//-----------------------------------------------------------------------------
// Sprite_Character
//
// The sprite for displaying a character.

class Sprite_Character extends Sprite {
    initialize(character) {
        super.initialize();
        this.initMembers();
        this.setCharacter(character);
    }
    initMembers() {
        this.anchor.x = 0.5;
        this.anchor.y = 1;
        this._character = null;
        this._balloonDuration = 0;
        this._tilesetId = 0;
        this._upperBody = null;
        this._lowerBody = null;
    }
    setCharacter(character) {
        this._character = character;
    }
    checkCharacter(character) {
        return this._character === character;
    }
    update() {
        this.updateBitmap();
        this.updateFrame();
        this.updatePosition();
        this.updateOther();
        this.updateVisibility();
    }
    updateVisibility() {
        Sprite.prototype.updateVisibility.call(this);
        if (this.isEmptyCharacter() || this._character.isTransparent()) {
            this.visible = false;
        }
    }
    isTile() {
        return this._character.isTile();
    }
    isObjectCharacter() {
        return this._character.isObjectCharacter();
    }
    isEmptyCharacter() {
        return this._tileId === 0 && !this._characterName;
    }
    tilesetBitmap(tileId) {
        const tileset = $gameMap.tileset();
        const setNumber = 5 + Math.floor(tileId / 256);
        return ImageManager.loadTileset(tileset.tilesetNames[setNumber]);
    }
    updateBitmap() {
        if (this.isImageChanged()) {
            this._tilesetId = $gameMap.tilesetId();
            this._tileId = this._character.tileId();
            this._characterName = this._character.characterName();
            this._characterIndex = this._character.characterIndex();
            if (this._tileId > 0) {
                this.setTileBitmap();
            } else {
                this.setCharacterBitmap();
            }
        }
    }
    isImageChanged() {
        return (
            this._tilesetId !== $gameMap.tilesetId() ||
            this._tileId !== this._character.tileId() ||
            this._characterName !== this._character.characterName() ||
            this._characterIndex !== this._character.characterIndex()
        );
    }
    setTileBitmap() {
        this.bitmap = this.tilesetBitmap(this._tileId);
    }
    setCharacterBitmap() {
        this.bitmap = ImageManager.loadCharacter(this._characterName);
        this._isBigCharacter = ImageManager.isBigCharacter(this._characterName);
    }
    updateFrame() {
        if (this._tileId > 0) {
            this.updateTileFrame();
        } else {
            this.updateCharacterFrame();
        }
    }
    updateTileFrame() {
        const tileId = this._tileId;
        const pw = this.patternWidth();
        const ph = this.patternHeight();
        const sx = ((Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)) * pw;
        const sy = (Math.floor((tileId % 256) / 8) % 16) * ph;
        this.setFrame(sx, sy, pw, ph);
    }
    updateCharacterFrame() {
        const pw = this.patternWidth();
        const ph = this.patternHeight();
        const sx = (this.characterBlockX() + this.characterPatternX()) * pw;
        const sy = (this.characterBlockY() + this.characterPatternY()) * ph;
        this.updateHalfBodySprites();
        if (this._bushDepth > 0) {
            const d = this._bushDepth;
            this._upperBody.setFrame(sx, sy, pw, ph - d);
            this._lowerBody.setFrame(sx, sy + ph - d, pw, d);
            this.setFrame(sx, sy, 0, ph);
        } else {
            this.setFrame(sx, sy, pw, ph);
        }
    }
    characterBlockX() {
        if (this._isBigCharacter) {
            return 0;
        } else {
            const index = this._character.characterIndex();
            return (index % 4) * 3;
        }
    }
    characterBlockY() {
        if (this._isBigCharacter) {
            return 0;
        } else {
            const index = this._character.characterIndex();
            return Math.floor(index / 4) * 4;
        }
    }
    characterPatternX() {
        return this._character.pattern();
    }
    characterPatternY() {
        return (this._character.direction() - 2) / 2;
    }
    patternWidth() {
        if (this._tileId > 0) {
            return $gameMap.tileWidth();
        } else if (this._isBigCharacter) {
            return this.bitmap.width / 3;
        } else {
            return this.bitmap.width / 12;
        }
    }
    patternHeight() {
        if (this._tileId > 0) {
            return $gameMap.tileHeight();
        } else if (this._isBigCharacter) {
            return this.bitmap.height / 4;
        } else {
            return this.bitmap.height / 8;
        }
    }
    updateHalfBodySprites() {
        if (this._bushDepth > 0) {
            this.createHalfBodySprites();
            this._upperBody.bitmap = this.bitmap;
            this._upperBody.visible = true;
            this._upperBody.y = -this._bushDepth;
            this._lowerBody.bitmap = this.bitmap;
            this._lowerBody.visible = true;
            const blendColor = this._blendColor;
            const colorTone = this._colorTone;
            const blendMode = this.blendMode;
            this._upperBody.setBlendColor(blendColor);
            this._lowerBody.setBlendColor(blendColor);
            this._upperBody.setColorTone(colorTone);
            this._lowerBody.setColorTone(colorTone);
            this._upperBody.blendMode = blendMode;
            this._lowerBody.blendMode = blendMode;
        } else if (this._upperBody) {
            this._upperBody.visible = false;
            this._lowerBody.visible = false;
        }
    }
    createHalfBodySprites() {
        if (!this._upperBody) {
            this._upperBody = new Sprite();
            this._upperBody.anchor.x = 0.5;
            this._upperBody.anchor.y = 1;
            this.addChild(this._upperBody);
        }
        if (!this._lowerBody) {
            this._lowerBody = new Sprite();
            this._lowerBody.anchor.x = 0.5;
            this._lowerBody.anchor.y = 1;
            this._lowerBody.opacity = 128;
            this.addChild(this._lowerBody);
        }
    }
    updatePosition() {
        this.x = this._character.screenX();
        this.y = this._character.screenY();
        this.z = this._character.screenZ();
    }
    updateOther() {
        this.opacity = this._character.opacity();
        this.blendMode = this._character.blendMode();
        this._bushDepth = this._character.bushDepth();
    }
}
//-----------------------------------------------------------------------------
// Sprite_Battler
//
// The superclass of Sprite_Actor and Sprite_Enemy.

class Sprite_Battler extends Sprite_Clickable {
    initialize(battler) {
        super.initialize();
        this.initMembers();
        this.setBattler(battler);
    }
    initMembers() {
        this.anchor.x = 0.5;
        this.anchor.y = 1;
        this._battler = null;
        this._damages = [];
        this._homeX = 0;
        this._homeY = 0;
        this._offsetX = 0;
        this._offsetY = 0;
        this._targetOffsetX = NaN;
        this._targetOffsetY = NaN;
        this._movementDuration = 0;
        this._selectionEffectCount = 0;
        this.damageRemoveHandler = sprite => {
            const index = this._damages.indexOf(sprite);
            this._damages.splice(index, 1);
        }
    }
    setBattler(battler) {
        this._battler = battler;
    }
    checkBattler(battler) {
        return this._battler === battler;
    }
    mainSprite() {
        return this;
    }
    setHome(x, y) {
        this._homeX = x;
        this._homeY = y;
        this.updatePosition();
    }
    update() {
        super.update();
        if (this._battler) {
            this.updateMain();
            this.updateDamagePopup();
            this.updateSelectionEffect();
            this.updateVisibility();
        } else {
            this.bitmap = null;
        }
    }
    updateVisibility() {
        Sprite_Clickable.prototype.updateVisibility.call(this);
        if (!this._battler || !this._battler.isSpriteVisible()) {
            this.visible = false;
        }
    }
    updateMain() {
        if (this._battler.isSpriteVisible()) {
            this.updateBitmap();
            this.updateFrame();
        }
        this.updateMove();
        this.updatePosition();
    }
    updateBitmap() {
        //
    }
    updateFrame() {
        //
    }
    updateMove() {
        if (this._movementDuration > 0) {
            const d = this._movementDuration;
            this._offsetX = (this._offsetX * (d - 1) + this._targetOffsetX) / d;
            this._offsetY = (this._offsetY * (d - 1) + this._targetOffsetY) / d;
            this._movementDuration--;
            if (this._movementDuration === 0) {
                this.onMoveEnd();
            }
        }
    }
    updatePosition() {
        this.x = this._homeX + this._offsetX;
        this.y = this._homeY + this._offsetY;
    }
    updateDamagePopup() {
        this.setupDamagePopup();
    }
    updateSelectionEffect() {
        const target = this.mainSprite();
        if (this._battler.isSelected()) {
            this._selectionEffectCount++;
            if (this._selectionEffectCount % 30 < 15) {
                target.setBlendColor([255, 255, 255, 64]);
            } else {
                target.setBlendColor([0, 0, 0, 0]);
            }
        } else if (this._selectionEffectCount > 0) {
            this._selectionEffectCount = 0;
            target.setBlendColor([0, 0, 0, 0]);
        }
    }
    setupDamagePopup() {
        if (this._battler.isDamagePopupRequested()) {
            if (this._battler.isSpriteVisible()) {
                this.createDamageSprite();
            }
            this._battler.clearDamagePopup();
            this._battler.clearResult();
        }
    }
    createDamageSprite() {
        const last = this._damages[this._damages.length - 1];
        const sprite = new Sprite_Damage();
        if (last) {
            sprite.x = last.x + 8;
            sprite.y = last.y - 16;
        } else {
            sprite.x = this.x + this.damageOffsetX();
            sprite.y = this.y + this.damageOffsetY();
        }
        sprite.setup(this._battler);
        sprite.onEndHandler = this.damageRemoveHandler;
        this._damages.push(sprite);
        this.parent.addChild(sprite);
    }
    damageOffsetX() {
        return 0;
    }
    damageOffsetY() {
        return 0;
    }
    startMove(x, y, duration) {
        if (this._targetOffsetX !== x || this._targetOffsetY !== y) {
            this._targetOffsetX = x;
            this._targetOffsetY = y;
            this._movementDuration = duration;
            if (duration === 0) {
                this._offsetX = x;
                this._offsetY = y;
            }
        }
    }
    onMoveEnd() {
        //
    }
    isEffecting() {
        return false;
    }
    isMoving() {
        return this._movementDuration > 0;
    }
    inHomePosition() {
        return this._offsetX === 0 && this._offsetY === 0;
    }
    onMouseEnter() {
        $gameTemp.setTouchState(this._battler, "select");
    }
    onPress() {
        $gameTemp.setTouchState(this._battler, "select");
    }
    onClick() {
        $gameTemp.setTouchState(this._battler, "click");
    }
}
//-----------------------------------------------------------------------------
// Sprite_Actor
//
// The sprite for displaying an actor.

class Sprite_Actor extends Sprite_Battler {
    initialize(battler) {
        super.initialize(battler);
        this.moveToStartPosition();
    }
    initMembers() {
        Sprite_Battler.prototype.initMembers.call(this);
        this._battlerName = "";
        this._motion = null;
        this._motionCount = 0;
        this._pattern = 0;
        this.createShadowSprite();
        this.createWeaponSprite();
        this.createMainSprite();
        this.createStateSprite();
    }
    mainSprite() {
        return this._mainSprite;
    }
    createMainSprite() {
        this._mainSprite = new Sprite();
        this._mainSprite.anchor.x = 0.5;
        this._mainSprite.anchor.y = 1;
        this.addChild(this._mainSprite);
    }
    createShadowSprite() {
        this._shadowSprite = new Sprite();
        this._shadowSprite.bitmap = ImageManager.loadSystem("Shadow2");
        this._shadowSprite.anchor.x = 0.5;
        this._shadowSprite.anchor.y = 0.5;
        this._shadowSprite.y = -2;
        this.addChild(this._shadowSprite);
    }
    createWeaponSprite() {
        this._weaponSprite = new Sprite_Weapon();
        this.addChild(this._weaponSprite);
    }
    createStateSprite() {
        this._stateSprite = new Sprite_StateOverlay();
        this.addChild(this._stateSprite);
    }
    setBattler(battler) {
        Sprite_Battler.prototype.setBattler.call(this, battler);
        if (battler !== this._actor) {
            this._actor = battler;
            if (battler) {
                this.setActorHome(battler.index());
            } else {
                this._mainSprite.bitmap = null;
                this._battlerName = "";
            }
            this.startEntryMotion();
            this._stateSprite.setup(battler);
        }
    }
    moveToStartPosition() {
        this.startMove(300, 0, 0);
    }
    setActorHome(index) {
        this.setHome(600 + index * 32, 280 + index * 48);
    }
    update() {
        Sprite_Battler.prototype.update.call(this);
        this.updateShadow();
        if (this._actor) {
            this.updateMotion();
        }
    }
    updateShadow() {
        this._shadowSprite.visible = !!this._actor;
    }
    updateMain() {
        Sprite_Battler.prototype.updateMain.call(this);
        if (this._actor.isSpriteVisible() && !this.isMoving()) {
            this.updateTargetPosition();
        }
    }
    setupMotion() {
        if (this._actor.isMotionRequested()) {
            this.startMotion(this._actor.motionType());
            this._actor.clearMotion();
        }
    }
    setupWeaponAnimation() {
        if (this._actor.isWeaponAnimationRequested()) {
            this._weaponSprite.setup(this._actor.weaponImageId());
            this._actor.clearWeaponAnimation();
        }
    }
    startMotion(motionType) {
        const newMotion = Sprite_Actor.MOTIONS[motionType];
        if (this._motion !== newMotion) {
            this._motion = newMotion;
            this._motionCount = 0;
            this._pattern = 0;
        }
    }
    updateTargetPosition() {
        if (this._actor.canMove() && BattleManager.isEscaped()) {
            this.retreat();
        } else if (this.shouldStepForward()) {
            this.stepForward();
        } else if (!this.inHomePosition()) {
            this.stepBack();
        }
    }
    shouldStepForward() {
        return this._actor.isInputting() || this._actor.isActing();
    }
    updateBitmap() {
        Sprite_Battler.prototype.updateBitmap.call(this);
        const name = this._actor.battlerName();
        if (this._battlerName !== name) {
            this._battlerName = name;
            this._mainSprite.bitmap = ImageManager.loadSvActor(name);
        }
    }
    updateFrame() {
        Sprite_Battler.prototype.updateFrame.call(this);
        const bitmap = this._mainSprite.bitmap;
        if (bitmap) {
            const motionIndex = this._motion ? this._motion.index : 0;
            const pattern = this._pattern < 3 ? this._pattern : 1;
            const cw = bitmap.width / 9;
            const ch = bitmap.height / 6;
            const cx = Math.floor(motionIndex / 6) * 3 + pattern;
            const cy = motionIndex % 6;
            this._mainSprite.setFrame(cx * cw, cy * ch, cw, ch);
            this.setFrame(0, 0, cw, ch);
        }
    }
    updateMove() {
        const bitmap = this._mainSprite.bitmap;
        if (!bitmap || bitmap.isReady()) {
            Sprite_Battler.prototype.updateMove.call(this);
        }
    }
    updateMotion() {
        this.setupMotion();
        this.setupWeaponAnimation();
        if (this._actor.isMotionRefreshRequested()) {
            this.refreshMotion();
            this._actor.clearMotion();
        }
        this.updateMotionCount();
    }
    updateMotionCount() {
        if (this._motion && ++this._motionCount >= this.motionSpeed()) {
            if (this._motion.loop) {
                this._pattern = (this._pattern + 1) % 4;
            } else if (this._pattern < 2) {
                this._pattern++;
            } else {
                this.refreshMotion();
            }
            this._motionCount = 0;
        }
    }
    motionSpeed() {
        return 12;
    }
    refreshMotion() {
        const actor = this._actor;
        if (actor) {
            const stateMotion = actor.stateMotionIndex();
            if (actor.isInputting() || actor.isActing()) {
                this.startMotion("walk");
            } else if (stateMotion === 3) {
                this.startMotion("dead");
            } else if (stateMotion === 2) {
                this.startMotion("sleep");
            } else if (actor.isChanting()) {
                this.startMotion("chant");
            } else if (actor.isGuard() || actor.isGuardWaiting()) {
                this.startMotion("guard");
            } else if (stateMotion === 1) {
                this.startMotion("abnormal");
            } else if (actor.isDying()) {
                this.startMotion("dying");
            } else if (actor.isUndecided()) {
                this.startMotion("walk");
            } else {
                this.startMotion("wait");
            }
        }
    }
    startEntryMotion() {
        if (this._actor && this._actor.canMove()) {
            this.startMotion("walk");
            this.startMove(0, 0, 30);
        } else if (!this.isMoving()) {
            this.refreshMotion();
            this.startMove(0, 0, 0);
        }
    }
    stepForward() {
        this.startMove(-48, 0, 12);
    }
    stepBack() {
        this.startMove(0, 0, 12);
    }
    retreat() {
        this.startMove(300, 0, 30);
    }
    onMoveEnd() {
        Sprite_Battler.prototype.onMoveEnd.call(this);
        if (!BattleManager.isBattleEnd()) {
            this.refreshMotion();
        }
    }
    damageOffsetX() {
        return Sprite_Battler.prototype.damageOffsetX.call(this) - 32;
    }
    damageOffsetY() {
        return Sprite_Battler.prototype.damageOffsetY.call(this);
    }
}
Sprite_Actor.MOTIONS = {
    walk: { index: 0, loop: true },
    wait: { index: 1, loop: true },
    chant: { index: 2, loop: true },
    guard: { index: 3, loop: true },
    damage: { index: 4, loop: false },
    evade: { index: 5, loop: false },
    thrust: { index: 6, loop: false },
    swing: { index: 7, loop: false },
    missile: { index: 8, loop: false },
    skill: { index: 9, loop: false },
    spell: { index: 10, loop: false },
    item: { index: 11, loop: false },
    escape: { index: 12, loop: true },
    victory: { index: 13, loop: true },
    dying: { index: 14, loop: true },
    abnormal: { index: 15, loop: true },
    sleep: { index: 16, loop: true },
    dead: { index: 17, loop: true }
};
//-----------------------------------------------------------------------------
// Sprite_Enemy
//
// The sprite for displaying an enemy.

class Sprite_Enemy extends Sprite_Battler {
    initMembers() {
        Sprite_Battler.prototype.initMembers.call(this);
        this._enemy = null;
        this._appeared = false;
        this._battlerName = null;
        this._battlerHue = 0;
        this._effectType = null;
        this._effectDuration = 0;
        this._shake = 0;
        this.createStateIconSprite();
    }
    createStateIconSprite() {
        this._stateIconSprite = new Sprite_StateIcon();
        this.addChild(this._stateIconSprite);
    }
    setBattler(battler) {
        Sprite_Battler.prototype.setBattler.call(this, battler);
        this._enemy = battler;
        this.setHome(battler.screenX(), battler.screenY());
        this._stateIconSprite.setup(battler);
    }
    update() {
        Sprite_Battler.prototype.update.call(this);
        if (this._enemy) {
            this.updateEffect();
            this.updateStateSprite();
        }
    }
    updateBitmap() {
        Sprite_Battler.prototype.updateBitmap.call(this);
        const name = this._enemy.battlerName();
        const hue = this._enemy.battlerHue();
        if (this._battlerName !== name || this._battlerHue !== hue) {
            this._battlerName = name;
            this._battlerHue = hue;
            this.loadBitmap(name);
            this.setHue(hue);
            this.initVisibility();
        }
    }
    loadBitmap(name) {
        if ($gameSystem.isSideView()) {
            this.bitmap = ImageManager.loadSvEnemy(name);
        } else {
            this.bitmap = ImageManager.loadEnemy(name);
        }
    }
    setHue(hue) {
        Sprite_Battler.prototype.setHue.call(this, hue);
        for (const child of this.children) {
            if (child.setHue) {
                child.setHue(-hue);
            }
        }
    }
    updateFrame() {
        Sprite_Battler.prototype.updateFrame.call(this);
        if (this._effectType === "bossCollapse") {
            this.setFrame(0, 0, this.bitmap.width, this._effectDuration);
        } else {
            this.setFrame(0, 0, this.bitmap.width, this.bitmap.height);
        }
    }
    updatePosition() {
        Sprite_Battler.prototype.updatePosition.call(this);
        this.x += this._shake;
    }
    updateStateSprite() {
        this._stateIconSprite.y = -Math.round((this.bitmap.height + 40) * 0.9);
        if (this._stateIconSprite.y < 20 - this.y) {
            this._stateIconSprite.y = 20 - this.y;
        }
    }
    initVisibility() {
        this._appeared = this._enemy.isAlive();
        if (!this._appeared) {
            this.opacity = 0;
        }
    }
    setupEffect() {
        if (this._appeared && this._enemy.isEffectRequested()) {
            this.startEffect(this._enemy.effectType());
            this._enemy.clearEffect();
        }
        if (!this._appeared && this._enemy.isAlive()) {
            this.startEffect("appear");
        } else if (this._appeared && this._enemy.isHidden()) {
            this.startEffect("disappear");
        }
    }
    startEffect(effectType) {
        this._effectType = effectType;
        switch (this._effectType) {
            case "appear":
                this.startAppear();
                break;
            case "disappear":
                this.startDisappear();
                break;
            case "whiten":
                this.startWhiten();
                break;
            case "blink":
                this.startBlink();
                break;
            case "collapse":
                this.startCollapse();
                break;
            case "bossCollapse":
                this.startBossCollapse();
                break;
            case "instantCollapse":
                this.startInstantCollapse();
                break;
        }
        this.revertToNormal();
    }
    startAppear() {
        this._effectDuration = 16;
        this._appeared = true;
    }
    startDisappear() {
        this._effectDuration = 32;
        this._appeared = false;
    }
    startWhiten() {
        this._effectDuration = 16;
    }
    startBlink() {
        this._effectDuration = 20;
    }
    startCollapse() {
        this._effectDuration = 32;
        this._appeared = false;
    }
    startBossCollapse() {
        this._effectDuration = this.bitmap.height;
        this._appeared = false;
    }
    startInstantCollapse() {
        this._effectDuration = 16;
        this._appeared = false;
    }
    updateEffect() {
        this.setupEffect();
        if (this._effectDuration > 0) {
            this._effectDuration--;
            switch (this._effectType) {
                case "whiten":
                    this.updateWhiten();
                    break;
                case "blink":
                    this.updateBlink();
                    break;
                case "appear":
                    this.updateAppear();
                    break;
                case "disappear":
                    this.updateDisappear();
                    break;
                case "collapse":
                    this.updateCollapse();
                    break;
                case "bossCollapse":
                    this.updateBossCollapse();
                    break;
                case "instantCollapse":
                    this.updateInstantCollapse();
                    break;
            }
            if (this._effectDuration === 0) {
                this._effectType = null;
            }
        }
    }
    isEffecting() {
        return this._effectType !== null;
    }
    revertToNormal() {
        this._shake = 0;
        this.blendMode = 0;
        this.opacity = 255;
        this.setBlendColor([0, 0, 0, 0]);
    }
    updateWhiten() {
        const alpha = 128 - (16 - this._effectDuration) * 8;
        this.setBlendColor([255, 255, 255, alpha]);
    }
    updateBlink() {
        this.opacity = this._effectDuration % 10 < 5 ? 255 : 0;
    }
    updateAppear() {
        this.opacity = (16 - this._effectDuration) * 16;
    }
    updateDisappear() {
        this.opacity = 256 - (32 - this._effectDuration) * 10;
    }
    updateCollapse() {
        this.blendMode = 1;
        this.setBlendColor([255, 128, 128, 128]);
        this.opacity *= this._effectDuration / (this._effectDuration + 1);
    }
    updateBossCollapse() {
        this._shake = (this._effectDuration % 2) * 4 - 2;
        this.blendMode = 1;
        this.opacity *= this._effectDuration / (this._effectDuration + 1);
        this.setBlendColor([255, 255, 255, 255 - this.opacity]);
        if (this._effectDuration % 20 === 19) {
            SoundManager.playBossCollapse2();
        }
    }
    updateInstantCollapse() {
        this.opacity = 0;
    }
    damageOffsetX() {
        return Sprite_Battler.prototype.damageOffsetX.call(this);
    }
    damageOffsetY() {
        return Sprite_Battler.prototype.damageOffsetY.call(this) - 8;
    }
}
//-----------------------------------------------------------------------------
// Sprite_Animation
//
// The sprite for displaying an animation.

class Sprite_Animation extends PIXI.Container {
    constructor(){
        super();
        this.initialize();
    }
    initialize() {
        this.initMembers();
    }
    initMembers() {
        this._targets = [];
        this._animation = null;
        this._mirror = false;
        this._delay = 0;
        this._previous = null;
        this._effect = null;
        this._handle = null;
        this._playing = false;
        this._started = false;
        this._frameIndex = 0;
        this._maxTimingFrames = 0;
        this._flashColor = [0, 0, 0, 0];
        this._flashDuration = 0;
        this._viewportSize = 4096;
        this.z = 8;
    }
    destroy(options) {
        if (this._handle) {
            this._handle.stop();
        }
        this._effect = null;
        this._handle = null;
        this._playing = false;
        this._started = false;
        PIXI.Container.prototype.destroy.call(this, options);
    }
    // prettier-ignore
    setup(targets, animation, mirror, delay, previous) {
        this._targets = targets;
        this._animation = animation;
        this._mirror = mirror;
        this._delay = delay;
        this._previous = previous;
        this._effect = EffectManager.load(animation.effectName);
        this._playing = true;
        const timings = animation.soundTimings.concat(animation.flashTimings);
        for (const timing of timings) {
            if (timing.frame > this._maxTimingFrames) {
                this._maxTimingFrames = timing.frame;
            }
        }
    }
    update() {
        if (this._delay > 0) {
            this._delay--;
        } else if (this._playing) {
            if (!this._started && this.canStart()) {
                if (this._effect) {
                    if (this._effect.isLoaded) {
                        this._handle = Graphics.effekseer.play(this._effect);
                        this._started = true;
                    } else {
                        EffectManager.checkErrors();
                    }
                } else {
                    this._started = true;
                }
            }
            if (this._started) {
                this.updateEffectGeometry();
                this.updateMain();
                this.updateFlash();
            }
        }
    }
    canStart() {
        if (this._previous && this.shouldWaitForPrevious()) {
            return !this._previous.isPlaying();
        } else {
            return true;
        }
    }
    shouldWaitForPrevious() {
        // [Note] Older versions of Effekseer were very heavy on some mobile
        //   devices. We don't need this anymore.
        return false;
    }
    updateEffectGeometry() {
        const scale = this._animation.scale / 100;
        const r = Math.PI / 180;
        const rx = this._animation.rotation.x * r;
        const ry = this._animation.rotation.y * r;
        const rz = this._animation.rotation.z * r;
        if (this._handle) {
            this._handle.setLocation(0, 0, 0);
            this._handle.setRotation(rx, ry, rz);
            this._handle.setScale(scale, scale, scale);
            this._handle.setSpeed(this._animation.speed / 100);
        }
    }
    updateMain() {
        this.processSoundTimings();
        this.processFlashTimings();
        this._frameIndex++;
        this.checkEnd();
    }
    processSoundTimings() {
        for (const timing of this._animation.soundTimings) {
            if (timing.frame === this._frameIndex) {
                AudioManager.playSe(timing.se);
            }
        }
    }
    processFlashTimings() {
        for (const timing of this._animation.flashTimings) {
            if (timing.frame === this._frameIndex) {
                this._flashColor = timing.color.clone();
                this._flashDuration = timing.duration;
            }
        }
    }
    checkEnd() {
        if (this._frameIndex > this._maxTimingFrames &&
            this._flashDuration === 0 &&
            !(this._handle && this._handle.exists)) {
            this._playing = false;
        }
    }
    updateFlash() {
        if (this._flashDuration > 0) {
            const d = this._flashDuration--;
            this._flashColor[3] *= (d - 1) / d;
            for (const target of this._targets) {
                target.setBlendColor(this._flashColor);
            }
        }
    }
    isPlaying() {
        return this._playing;
    }
    setRotation(x, y, z) {
        if (this._handle) {
            this._handle.setRotation(x, y, z);
        }
    }
    _render(renderer) {
        if (this._targets.length > 0 && this._handle && this._handle.exists) {
            this.onBeforeRender(renderer);
            this.setProjectionMatrix(renderer);
            this.setCameraMatrix(renderer);
            this.setViewport(renderer);
            Graphics.effekseer.beginDraw();
            Graphics.effekseer.drawHandle(this._handle);
            Graphics.effekseer.endDraw();
            this.resetViewport(renderer);
            this.onAfterRender(renderer);
        }
    }
    setProjectionMatrix(renderer) {
        const x = this._mirror ? -1 : 1;
        const y = -1;
        const p = -(this._viewportSize / renderer.view.height);
        // prettier-ignore
        Graphics.effekseer.setProjectionMatrix([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, 1, p,
            0, 0, 0, 1,
        ]);
    }
    setCameraMatrix( /*renderer*/) {
        // prettier-ignore
        Graphics.effekseer.setCameraMatrix([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, -10, 1
        ]);
    }
    setViewport(renderer) {
        const vw = this._viewportSize;
        const vh = this._viewportSize;
        const vx = this._animation.offsetX - vw / 2;
        const vy = this._animation.offsetY - vh / 2;
        const pos = this.targetPosition(renderer);
        renderer.gl.viewport(vx + pos.x, vy + pos.y, vw, vh);
    }
    targetPosition(renderer) {
        const pos = new Point();
        if (this._animation.displayType === 2) {
            pos.x = renderer.view.width / 2;
            pos.y = renderer.view.height / 2;
        } else {
            for (const target of this._targets) {
                const tpos = this.targetSpritePosition(target);
                pos.x += tpos.x;
                pos.y += tpos.y;
            }
            pos.x /= this._targets.length;
            pos.y /= this._targets.length;
        }
        return pos;
    }
    targetSpritePosition(sprite) {
        const point = new Point(0, -sprite.height / 2);
        if (this._animation.alignBottom) {
            point.y = 0;
        }
        sprite.updateTransform();
        return sprite.worldTransform.apply(point);
    }
    resetViewport(renderer) {
        renderer.gl.viewport(0, 0, renderer.view.width, renderer.view.height);
    }
    onBeforeRender(renderer) {
        renderer.batch.flush();
        renderer.geometry.reset();
    }
    onAfterRender(renderer) {
        renderer.texture.reset();
        renderer.geometry.reset();
        renderer.state.reset();
        renderer.shader.reset();
        renderer.framebuffer.reset();
    }
}
//-----------------------------------------------------------------------------
// Sprite_AnimationMV
//
// The sprite for displaying an old format animation.

class Sprite_AnimationMV extends Sprite {
    initialize() {
        super.initialize();
        this.initMembers();
    }
    initMembers() {
        this._targets = [];
        this._animation = null;
        this._mirror = false;
        this._delay = 0;
        this._rate = 4;
        this._duration = 0;
        this._flashColor = [0, 0, 0, 0];
        this._flashDuration = 0;
        this._screenFlashDuration = 0;
        this._hidingDuration = 0;
        this._hue1 = 0;
        this._hue2 = 0;
        this._bitmap1 = null;
        this._bitmap2 = null;
        this._cellSprites = [];
        this._screenFlashSprite = null;
        this.z = 8;
    }
    // prettier-ignore
    setup(targets, animation, mirror, delay) {
        this._targets = targets;
        this._animation = animation;
        this._mirror = mirror;
        this._delay = delay;
        if (this._animation) {
            this.setupRate();
            this.setupDuration();
            this.loadBitmaps();
            this.createCellSprites();
            this.createScreenFlashSprite();
        }
    }
    setupRate() {
        this._rate = 4;
    }
    setupDuration() {
        this._duration = this._animation.frames.length * this._rate + 1;
    }
    update() {
        this.updateMain();
        this.updateFlash();
        this.updateScreenFlash();
        this.updateHiding();
    }
    updateFlash() {
        if (this._flashDuration > 0) {
            const d = this._flashDuration--;
            this._flashColor[3] *= (d - 1) / d;
            for (const target of this._targets) {
                target.setBlendColor(this._flashColor);
            }
        }
    }
    updateScreenFlash() {
        if (this._screenFlashDuration > 0) {
            const d = this._screenFlashDuration--;
            if (this._screenFlashSprite) {
                this._screenFlashSprite.x = -this.absoluteX();
                this._screenFlashSprite.y = -this.absoluteY();
                this._screenFlashSprite.opacity *= (d - 1) / d;
                this._screenFlashSprite.visible = this._screenFlashDuration > 0;
            }
        }
    }
    absoluteX() {
        let x = 0;
        let object = this;
        while (object) {
            x += object.x;
            object = object.parent;
        }
        return x;
    }
    absoluteY() {
        let y = 0;
        let object = this;
        while (object) {
            y += object.y;
            object = object.parent;
        }
        return y;
    }
    updateHiding() {
        if (this._hidingDuration > 0) {
            this._hidingDuration--;
            if (this._hidingDuration === 0) {
                for (const target of this._targets) {
                    target.show();
                }
            }
        }
    }
    isPlaying() {
        return this._duration > 0;
    }
    loadBitmaps() {
        const name1 = this._animation.animation1Name;
        const name2 = this._animation.animation2Name;
        this._hue1 = this._animation.animation1Hue;
        this._hue2 = this._animation.animation2Hue;
        this._bitmap1 = ImageManager.loadAnimation(name1);
        this._bitmap2 = ImageManager.loadAnimation(name2);
    }
    isReady() {
        return (
            this._bitmap1 &&
            this._bitmap1.isReady() &&
            this._bitmap2 &&
            this._bitmap2.isReady()
        );
    }
    createCellSprites() {
        this._cellSprites = [];
        for (let i = 0; i < 16; i++) {
            const sprite = new Sprite();
            sprite.anchor.x = 0.5;
            sprite.anchor.y = 0.5;
            this._cellSprites.push(sprite);
            this.addChild(sprite);
        }
    }
    createScreenFlashSprite() {
        this._screenFlashSprite = new ScreenSprite();
        this.addChild(this._screenFlashSprite);
    }
    updateMain() {
        if (this.isPlaying() && this.isReady()) {
            if (this._delay > 0) {
                this._delay--;
            } else {
                this._duration--;
                this.updatePosition();
                if (this._duration % this._rate === 0) {
                    this.updateFrame();
                }
                if (this._duration <= 0) {
                    this.onEnd();
                }
            }
        }
    }
    updatePosition() {
        if (this._animation.position === 3) {
            this.x = this.parent.width / 2;
            this.y = this.parent.height / 2;
        } else if (this._targets.length > 0) {
            const target = this._targets[0];
            const parent = target.parent;
            const grandparent = parent ? parent.parent : null;
            this.x = target.x;
            this.y = target.y;
            if (this.parent === grandparent) {
                this.x += parent.x;
                this.y += parent.y;
            }
            if (this._animation.position === 0) {
                this.y -= target.height;
            } else if (this._animation.position === 1) {
                this.y -= target.height / 2;
            }
        }
    }
    updateFrame() {
        if (this._duration > 0) {
            const frameIndex = this.currentFrameIndex();
            this.updateAllCellSprites(this._animation.frames[frameIndex]);
            for (const timing of this._animation.timings) {
                if (timing.frame === frameIndex) {
                    this.processTimingData(timing);
                }
            }
        }
    }
    currentFrameIndex() {
        return (
            this._animation.frames.length -
            Math.floor((this._duration + this._rate - 1) / this._rate)
        );
    }
    updateAllCellSprites(frame) {
        if (this._targets.length > 0) {
            for (let i = 0; i < this._cellSprites.length; i++) {
                const sprite = this._cellSprites[i];
                if (i < frame.length) {
                    this.updateCellSprite(sprite, frame[i]);
                } else {
                    sprite.visible = false;
                }
            }
        }
    }
    updateCellSprite(sprite, cell) {
        const pattern = cell[0];
        if (pattern >= 0) {
            const sx = (pattern % 5) * 192;
            const sy = Math.floor((pattern % 100) / 5) * 192;
            const mirror = this._mirror;
            sprite.bitmap = pattern < 100 ? this._bitmap1 : this._bitmap2;
            sprite.setHue(pattern < 100 ? this._hue1 : this._hue2);
            sprite.setFrame(sx, sy, 192, 192);
            sprite.x = cell[1];
            sprite.y = cell[2];
            sprite.rotation = (cell[4] * Math.PI) / 180;
            sprite.scale.x = cell[3] / 100;

            if (cell[5]) {
                sprite.scale.x *= -1;
            }
            if (mirror) {
                sprite.x *= -1;
                sprite.rotation *= -1;
                sprite.scale.x *= -1;
            }

            sprite.scale.y = cell[3] / 100;
            sprite.opacity = cell[6];
            sprite.blendMode = cell[7];
            sprite.visible = true;
        } else {
            sprite.visible = false;
        }
    }
    processTimingData(timing) {
        const duration = timing.flashDuration * this._rate;
        switch (timing.flashScope) {
            case 1:
                this.startFlash(timing.flashColor, duration);
                break;
            case 2:
                this.startScreenFlash(timing.flashColor, duration);
                break;
            case 3:
                this.startHiding(duration);
                break;
        }
        if (timing.se) {
            AudioManager.playSe(timing.se);
        }
    }
    startFlash(color, duration) {
        this._flashColor = color.clone();
        this._flashDuration = duration;
    }
    startScreenFlash(color, duration) {
        this._screenFlashDuration = duration;
        if (this._screenFlashSprite) {
            this._screenFlashSprite.setColor(color[0], color[1], color[2]);
            this._screenFlashSprite.opacity = color[3];
        }
    }
    startHiding(duration) {
        this._hidingDuration = duration;
        for (const target of this._targets) {
            target.hide();
        }
    }
    onEnd() {
        this._flashDuration = 0;
        this._screenFlashDuration = 0;
        this._hidingDuration = 0;
        for (const target of this._targets) {
            target.setBlendColor([0, 0, 0, 0]);
            target.show();
        }
    }
}
//-----------------------------------------------------------------------------
// Sprite_Battleback
//
// The sprite for displaying a background image in battle.

class Sprite_Battleback extends TilingSprite {
    initialize(type) {
        super.initialize();
        if (type === 0) {
            this.bitmap = this.battleback1Bitmap();
        } else {
            this.bitmap = this.battleback2Bitmap();
        }
    }
    adjustPosition() {
        this.width = Math.floor((1000 * Graphics.width) / 816);
        this.height = Math.floor((740 * Graphics.height) / 624);
        this.x = (Graphics.width - this.width) / 2;
        if ($gameSystem.isSideView()) {
            this.y = Graphics.height - this.height;
        } else {
            this.y = 0;
        }
        const ratioX = this.width / this.bitmap.width;
        const ratioY = this.height / this.bitmap.height;
        const scale = Math.max(ratioX, ratioY, 1.0);
        this.scale.x = scale;
        this.scale.y = scale;
    }
    battleback1Bitmap() {
        return ImageManager.loadBattleback1(this.battleback1Name());
    }
    battleback2Bitmap() {
        return ImageManager.loadBattleback2(this.battleback2Name());
    }
    battleback1Name() {
        if (BattleManager.isBattleTest()) {
            return $dataSystem.battleback1Name;
        } else if ($gameMap.battleback1Name() !== null) {
            return $gameMap.battleback1Name();
        } else if ($gameMap.isOverworld()) {
            return this.overworldBattleback1Name();
        } else {
            return "";
        }
    }
    battleback2Name() {
        if (BattleManager.isBattleTest()) {
            return $dataSystem.battleback2Name;
        } else if ($gameMap.battleback2Name() !== null) {
            return $gameMap.battleback2Name();
        } else if ($gameMap.isOverworld()) {
            return this.overworldBattleback2Name();
        } else {
            return "";
        }
    }
    overworldBattleback1Name() {
        if ($gamePlayer.isInVehicle()) {
            return this.shipBattleback1Name();
        } else {
            return this.normalBattleback1Name();
        }
    }
    overworldBattleback2Name() {
        if ($gamePlayer.isInVehicle()) {
            return this.shipBattleback2Name();
        } else {
            return this.normalBattleback2Name();
        }
    }
    normalBattleback1Name() {
        return (
            this.terrainBattleback1Name(this.autotileType(1)) ||
            this.terrainBattleback1Name(this.autotileType(0)) ||
            this.defaultBattleback1Name()
        );
    }
    normalBattleback2Name() {
        return (
            this.terrainBattleback2Name(this.autotileType(1)) ||
            this.terrainBattleback2Name(this.autotileType(0)) ||
            this.defaultBattleback2Name()
        );
    }
    terrainBattleback1Name(type) {
        switch (type) {
            case 24:
            case 25:
                return "Wasteland";
            case 26:
            case 27:
                return "DirtField";
            case 32:
            case 33:
                return "Desert";
            case 34:
                return "Lava1";
            case 35:
                return "Lava2";
            case 40:
            case 41:
                return "Snowfield";
            case 42:
                return "Clouds";
            case 4:
            case 5:
                return "PoisonSwamp";
            default:
                return null;
        }
    }
    terrainBattleback2Name(type) {
        switch (type) {
            case 20:
            case 21:
                return "Forest";
            case 22:
            case 30:
            case 38:
                return "Cliff";
            case 24:
            case 25:
            case 26:
            case 27:
                return "Wasteland";
            case 32:
            case 33:
                return "Desert";
            case 34:
            case 35:
                return "Lava";
            case 40:
            case 41:
                return "Snowfield";
            case 42:
                return "Clouds";
            case 4:
            case 5:
                return "PoisonSwamp";
        }
    }
    defaultBattleback1Name() {
        return "Grassland";
    }
    defaultBattleback2Name() {
        return "Grassland";
    }
    shipBattleback1Name() {
        return "Ship";
    }
    shipBattleback2Name() {
        return "Ship";
    }
    autotileType(z) {
        return $gameMap.autotileType($gamePlayer.x, $gamePlayer.y, z);
    }
}
//-----------------------------------------------------------------------------
// Sprite_Damage
//
// The sprite for displaying a popup damage.

class Sprite_Damage extends PIXI.Container {
    constructor() {
        super();
        this.initialize();
    }
    initialize() {
        this._duration = 90;
        this._flashColor = [0, 0, 0, 0];
        this._flashDuration = 0;
        this._colorType = 0;
        this.onEndHandler = null;
    }
    remove() {
        this.onEndHandler();
        this.parent.removeChild(this);
        this.destroy();
    }
    setup(target) {
        const result = target.result();
        if (result.missed || result.evaded) {
            this._colorType = 0;
            this.createMiss();
        } else if (result.hpAffected) {
            this._colorType = result.hpDamage >= 0 ? 0 : 1;
            this.createDigits(result.hpDamage);
        } else if (target.isAlive() && result.mpDamage !== 0) {
            this._colorType = result.mpDamage >= 0 ? 2 : 3;
            this.createDigits(result.mpDamage);
        }
        if (result.critical) {
            this.setupCriticalEffect();
        }
    }
    setupCriticalEffect() {
        this._flashColor = [255, 0, 0, 160];
        this._flashDuration = 60;
    }
    fontFace() {
        return $gameSystem.numberFontFace();
    }
    fontSize() {
        return $gameSystem.mainFontSize() + 4;
    }
    damageColor() {
        return ColorManager.damageColor(this._colorType);
    }
    outlineColor() {
        return "rgba(0, 0, 0, 0.7)";
    }
    outlineWidth() {
        return 4;
    }
    createMiss() {
        const h = this.fontSize();
        const w = Math.floor(h * 3.0);
        const sprite = this.createChildSprite(w, h);
        sprite.bitmap.drawText("Miss", 0, 0, w, h, "center");
        sprite.dy = 0;
    }
    createDigits(value) {
        const string = Math.abs(value).toString();
        const h = this.fontSize();
        const w = Math.floor(h * 0.75);
        for (let i = 0; i < string.length; i++) {
            const sprite = this.createChildSprite(w, h);
            sprite.bitmap.drawText(string[i], 0, 0, w, h, "center");
            sprite.x = (i - (string.length - 1) / 2) * w;
            sprite.dy = -i;
        }
    }
    createChildSprite(width, height) {
        const bitmap = this.createBitmap(width, height);
        const sprite = new Sprite(bitmap);
        sprite._anchor.set(0.5, 1);
        sprite.y = -40;
        sprite.ry = -40;
        return this.addChild(sprite);
    }
    createBitmap(width, height) {
        const bitmap = new Bitmap(width, height);
        bitmap.fontFace = this.fontFace();
        bitmap.fontSize = this.fontSize();
        bitmap.textColor = this.damageColor();
        bitmap.outlineColor = this.outlineColor();
        bitmap.outlineWidth = this.outlineWidth();
        return bitmap;
    }
    updateChild(sprite) {
        sprite.dy += 0.5;
        sprite.ry += sprite.dy;
        if (sprite.ry >= 0) {
            sprite.ry = 0;
            sprite.dy *= -0.6;
        }
        sprite.y = Math.round(sprite.ry);
        sprite.setBlendColor(this._flashColor);
    }
    update() {
        this.updateFlash();
        this.updateOpacity();
    }
    updateFlash() {
        if (this._flashDuration > 0) {
            const d = this._flashDuration--;
            this._flashColor[3] *= (d - 1) / d;
        }
    }
    updateOpacity() {
        if (this._duration < 10) {
            this.opacity = (255 * this._duration) / 10;
        }
    }
    isPlaying() {
        return this._duration > 0;
    }
}
//-----------------------------------------------------------------------------
// Sprite_Gauge
//
// The sprite for displaying a status gauge.

class Sprite_Gauge extends Sprite {
    initialize() {
        super.initialize();
        this.initMembers();
        this.createBitmap();
    }
    initMembers() {
        this._battler = null;
        this._statusType = "";
        this._value = NaN;
        this._maxValue = NaN;
        this._targetValue = NaN;
        this._targetMaxValue = NaN;
        this._duration = 0;
        this._flashingCount = 0;
    }
    destroy(options) {
        this.bitmap.destroy();
        Sprite.prototype.destroy.call(this, options);
    }
    createBitmap() {
        const width = this.bitmapWidth();
        const height = this.bitmapHeight();
        this.bitmap = new Bitmap(width, height);
    }
    bitmapWidth() {
        return 128;
    }
    bitmapHeight() {
        return 32;
    }
    textHeight() {
        return 24;
    }
    gaugeHeight() {
        return 12;
    }
    gaugeX() {
        if (this._statusType === "time") {
            return 0;
        } else {
            return this.measureLabelWidth() + 6;
        }
    }
    labelY() {
        return 3;
    }
    labelFontFace() {
        return $gameSystem.mainFontFace();
    }
    labelFontSize() {
        return $gameSystem.mainFontSize() - 2;
    }
    valueFontFace() {
        return $gameSystem.numberFontFace();
    }
    valueFontSize() {
        return $gameSystem.mainFontSize() - 6;
    }
    setup(battler, statusType) {
        this._battler = battler;
        this._statusType = statusType;
        this._value = this.currentValue();
        this._maxValue = this.currentMaxValue();
        this.updateBitmap();
    }
    update() {
        this.updateBitmap();
    }
    updateBitmap() {
        const value = this.currentValue();
        const maxValue = this.currentMaxValue();
        if (value !== this._targetValue || maxValue !== this._targetMaxValue) {
            this.updateTargetValue(value, maxValue);
        }
        this.updateGaugeAnimation();
        this.updateFlashing();
    }
    updateTargetValue(value, maxValue) {
        this._targetValue = value;
        this._targetMaxValue = maxValue;
        if (isNaN(this._value)) {
            this._value = value;
            this._maxValue = maxValue;
            this.redraw();
        } else {
            this._duration = this.smoothness();
        }
    }
    smoothness() {
        return this._statusType === "time" ? 5 : 20;
    }
    updateGaugeAnimation() {
        if (this._duration > 0) {
            const d = this._duration;
            this._value = (this._value * (d - 1) + this._targetValue) / d;
            this._maxValue = (this._maxValue * (d - 1) + this._targetMaxValue) / d;
            this._duration--;
            this.redraw();
        }
    }
    updateFlashing() {
        if (this._statusType === "time") {
            this._flashingCount++;
            if (this._battler.isInputting()) {
                if (this._flashingCount % 30 < 15) {
                    this.setBlendColor(this.flashingColor1());
                } else {
                    this.setBlendColor(this.flashingColor2());
                }
            } else {
                this.setBlendColor([0, 0, 0, 0]);
            }
        }
    }
    flashingColor1() {
        return [255, 255, 255, 64];
    }
    flashingColor2() {
        return [0, 0, 255, 48];
    }
    isValid() {
        if (this._battler) {
            if (this._statusType === "tp" && !this._battler.isPreserveTp()) {
                return $gameParty.inBattle();
            } else {
                return true;
            }
        }
        return false;
    }
    currentValue() {
        if (this._battler) {
            switch (this._statusType) {
                case "hp":
                    return this._battler.hp;
                case "mp":
                    return this._battler.mp;
                case "tp":
                    return this._battler.tp;
                case "time":
                    return this._battler.tpbChargeTime();
            }
        }
        return NaN;
    }
    currentMaxValue() {
        if (this._battler) {
            switch (this._statusType) {
                case "hp":
                    return this._battler.mhp;
                case "mp":
                    return this._battler.mmp;
                case "tp":
                    return this._battler.maxTp();
                case "time":
                    return 1;
            }
        }
        return NaN;
    }
    label() {
        switch (this._statusType) {
            case "hp":
                return TextManager.hpA;
            case "mp":
                return TextManager.mpA;
            case "tp":
                return TextManager.tpA;
            default:
                return "";
        }
    }
    gaugeBackColor() {
        return ColorManager.gaugeBackColor();
    }
    gaugeColor1() {
        switch (this._statusType) {
            case "hp":
                return ColorManager.hpGaugeColor1();
            case "mp":
                return ColorManager.mpGaugeColor1();
            case "tp":
                return ColorManager.tpGaugeColor1();
            case "time":
                return ColorManager.ctGaugeColor1();
            default:
                return ColorManager.normalColor();
        }
    }
    gaugeColor2() {
        switch (this._statusType) {
            case "hp":
                return ColorManager.hpGaugeColor2();
            case "mp":
                return ColorManager.mpGaugeColor2();
            case "tp":
                return ColorManager.tpGaugeColor2();
            case "time":
                return ColorManager.ctGaugeColor2();
            default:
                return ColorManager.normalColor();
        }
    }
    labelColor() {
        return ColorManager.systemColor();
    }
    labelOutlineColor() {
        return ColorManager.outlineColor();
    }
    labelOutlineWidth() {
        return 3;
    }
    valueColor() {
        switch (this._statusType) {
            case "hp":
                return ColorManager.hpColor(this._battler);
            case "mp":
                return ColorManager.mpColor(this._battler);
            case "tp":
                return ColorManager.tpColor(this._battler);
            default:
                return ColorManager.normalColor();
        }
    }
    valueOutlineColor() {
        return "rgba(0, 0, 0, 1)";
    }
    valueOutlineWidth() {
        return 2;
    }
    redraw() {
        this.bitmap.clear();
        const currentValue = this.currentValue();
        if (!isNaN(currentValue)) {
            this.drawGauge();
            if (this._statusType !== "time") {
                this.drawLabel();
                if (this.isValid()) {
                    this.drawValue();
                }
            }
        }
    }
    drawGauge() {
        const gaugeX = this.gaugeX();
        const gaugeY = this.textHeight() - this.gaugeHeight();
        const gaugewidth = this.bitmapWidth() - gaugeX;
        const gaugeHeight = this.gaugeHeight();
        this.drawGaugeRect(gaugeX, gaugeY, gaugewidth, gaugeHeight);
    }
    drawGaugeRect(x, y, width, height) {
        const rate = this.gaugeRate();
        const fillW = Math.floor((width - 2) * rate);
        const fillH = height - 2;
        const color0 = this.gaugeBackColor();
        const color1 = this.gaugeColor1();
        const color2 = this.gaugeColor2();
        this.bitmap.fillRect(x, y, width, height, color0);
        this.bitmap.gradientFillRect(x + 1, y + 1, fillW, fillH, color1, color2);
    }
    gaugeRate() {
        if (this.isValid()) {
            const value = this._value;
            const maxValue = this._maxValue;
            return maxValue > 0 ? value / maxValue : 0;
        } else {
            return 0;
        }
    }
    drawLabel() {
        const label = this.label();
        const x = this.labelOutlineWidth() / 2;
        const y = this.labelY();
        const width = this.bitmapWidth();
        const height = this.textHeight();
        this.setupLabelFont();
        this.bitmap.paintOpacity = this.labelOpacity();
        this.bitmap.drawText(label, x, y, width, height, "left");
        this.bitmap.paintOpacity = 255;
    }
    setupLabelFont() {
        this.bitmap.fontFace = this.labelFontFace();
        this.bitmap.fontSize = this.labelFontSize();
        this.bitmap.textColor = this.labelColor();
        this.bitmap.outlineColor = this.labelOutlineColor();
        this.bitmap.outlineWidth = this.labelOutlineWidth();
    }
    measureLabelWidth() {
        this.setupLabelFont();
        const labels = [TextManager.hpA, TextManager.mpA, TextManager.tpA];
        const widths = labels.map(str => this.bitmap.measureTextWidth(str));
        return Math.ceil(Math.max(...widths));
    }
    labelOpacity() {
        return this.isValid() ? 255 : 160;
    }
    drawValue() {
        const currentValue = this.currentValue();
        const width = this.bitmapWidth();
        const height = this.textHeight();
        this.setupValueFont();
        this.bitmap.drawText(currentValue, 0, 0, width, height, "right");
    }
    setupValueFont() {
        this.bitmap.fontFace = this.valueFontFace();
        this.bitmap.fontSize = this.valueFontSize();
        this.bitmap.textColor = this.valueColor();
        this.bitmap.outlineColor = this.valueOutlineColor();
        this.bitmap.outlineWidth = this.valueOutlineWidth();
    }
}
//-----------------------------------------------------------------------------
// Sprite_Name
//
// The sprite for displaying a status gauge.

class Sprite_Name extends Sprite {
    initialize() {
        super.initialize();
        this.initMembers();
        this.createBitmap();
    }
    initMembers() {
        this._battler = null;
        this._name = "";
        this._textColor = "";
    }
    destroy(options) {
        this.bitmap.destroy();
        Sprite.prototype.destroy.call(this, options);
    }
    createBitmap() {
        const width = this.bitmapWidth();
        const height = this.bitmapHeight();
        this.bitmap = new Bitmap(width, height);
    }
    bitmapWidth() {
        return 128;
    }
    bitmapHeight() {
        return 24;
    }
    fontFace() {
        return $gameSystem.mainFontFace();
    }
    fontSize() {
        return $gameSystem.mainFontSize();
    }
    setup(battler) {
        this._battler = battler;
        this.updateBitmap();
    }
    update() {
        this.updateBitmap();
    }
    updateBitmap() {
        const name = this.name();
        const color = this.textColor();
        if (name !== this._name || color !== this._textColor) {
            this._name = name;
            this._textColor = color;
            this.redraw();
        }
    }
    name() {
        return this._battler ? this._battler.name() : "";
    }
    textColor() {
        return ColorManager.hpColor(this._battler);
    }
    outlineColor() {
        return ColorManager.outlineColor();
    }
    outlineWidth() {
        return 3;
    }
    redraw() {
        const name = this.name();
        const width = this.bitmapWidth();
        const height = this.bitmapHeight();
        this.setupFont();
        this.bitmap.clear();
        this.bitmap.drawText(name, 0, 0, width, height, "left");
    }
    setupFont() {
        this.bitmap.fontFace = this.fontFace();
        this.bitmap.fontSize = this.fontSize();
        this.bitmap.textColor = this.textColor();
        this.bitmap.outlineColor = this.outlineColor();
        this.bitmap.outlineWidth = this.outlineWidth();
    }
}
//-----------------------------------------------------------------------------
// Sprite_StateIcon
//
// The sprite for displaying state icons.

class Sprite_StateIcon extends Sprite {
    initialize() {
        super.initialize();
        this.initMembers();
        this.loadBitmap();
    }
    initMembers() {
        this._battler = null;
        this._iconIndex = 0;
        this._animationCount = 0;
        this._animationIndex = 0;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
    }
    loadBitmap() {
        this.bitmap = ImageManager.loadSystem("IconSet");
        this.setFrame(0, 0, 0, 0);
    }
    setup(battler) {
        if (this._battler !== battler) {
            this._battler = battler;
            this._animationCount = this.animationWait();
        }
    }
    update() {
        this._animationCount++;
        if (this._animationCount >= this.animationWait()) {
            this.updateIcon();
            this.updateFrame();
            this._animationCount = 0;
        }
    }
    animationWait() {
        return 40;
    }
    updateIcon() {
        const icons = [];
        if (this.shouldDisplay()) {
            icons.push(...this._battler.allIcons());
        }
        if (icons.length > 0) {
            this._animationIndex++;
            if (this._animationIndex >= icons.length) {
                this._animationIndex = 0;
            }
            this._iconIndex = icons[this._animationIndex];
        } else {
            this._animationIndex = 0;
            this._iconIndex = 0;
        }
    }
    shouldDisplay() {
        const battler = this._battler;
        return battler && (battler.isActor() || battler.isAlive());
    }
    updateFrame() {
        const pw = ImageManager.iconWidth;
        const ph = ImageManager.iconHeight;
        const sx = (this._iconIndex % 16) * pw;
        const sy = Math.floor(this._iconIndex / 16) * ph;
        this.setFrame(sx, sy, pw, ph);
    }
}
//-----------------------------------------------------------------------------
// Sprite_StateOverlay
//
// The sprite for displaying an overlay image for a state.

class Sprite_StateOverlay extends Sprite {
    initialize() {
        super.initialize();
        this.initMembers();
        this.loadBitmap();
    }
    initMembers() {
        this._battler = null;
        this._overlayIndex = 0;
        this._animationCount = 0;
        this._pattern = 0;
        this.anchor.x = 0.5;
        this.anchor.y = 1;
    }
    loadBitmap() {
        this.bitmap = ImageManager.loadSystem("States");
        this.setFrame(0, 0, 0, 0);
    }
    setup(battler) {
        this._battler = battler;
    }
    update() {
        this._animationCount++;
        if (this._animationCount >= this.animationWait()) {
            this.updatePattern();
            this.updateFrame();
            this._animationCount = 0;
        }
    }
    animationWait() {
        return 8;
    }
    updatePattern() {
        this._pattern++;
        this._pattern %= 8;
        if (this._battler) {
            this._overlayIndex = this._battler.stateOverlayIndex();
        } else {
            this._overlayIndex = 0;
        }
    }
    updateFrame() {
        if (this._overlayIndex > 0) {
            const w = 96;
            const h = 96;
            const sx = this._pattern * w;
            const sy = (this._overlayIndex - 1) * h;
            this.setFrame(sx, sy, w, h);
        } else {
            this.setFrame(0, 0, 0, 0);
        }
    }
}
//-----------------------------------------------------------------------------
// Sprite_Weapon
//
// The sprite for displaying a weapon image for attacking.

class Sprite_Weapon extends Sprite {
    initialize() {
        super.initialize();
        this.initMembers();
    }
    initMembers() {
        this._weaponImageId = 0;
        this._animationCount = 0;
        this._pattern = 0;
        this.anchor.x = 0.5;
        this.anchor.y = 1;
        this.x = -16;
    }
    setup(weaponImageId) {
        this._weaponImageId = weaponImageId;
        this._animationCount = 0;
        this._pattern = 0;
        this.loadBitmap();
        this.updateFrame();
    }
    update() {
        this._animationCount++;
        if (this._animationCount >= this.animationWait()) {
            this.updatePattern();
            this.updateFrame();
            this._animationCount = 0;
        }
    }
    animationWait() {
        return 12;
    }
    updatePattern() {
        this._pattern++;
        if (this._pattern >= 3) {
            this._weaponImageId = 0;
        }
    }
    loadBitmap() {
        const pageId = Math.floor((this._weaponImageId - 1) / 12) + 1;
        if (pageId >= 1) {
            this.bitmap = ImageManager.loadSystem("Weapons" + pageId);
        } else {
            this.bitmap = ImageManager.loadSystem("");
        }
    }
    updateFrame() {
        if (this._weaponImageId > 0) {
            const index = (this._weaponImageId - 1) % 12;
            const w = 96;
            const h = 64;
            const sx = (Math.floor(index / 6) * 3 + this._pattern) * w;
            const sy = Math.floor(index % 6) * h;
            this.setFrame(sx, sy, w, h);
        } else {
            this.setFrame(0, 0, 0, 0);
        }
    }
    isPlaying() {
        return this._weaponImageId > 0;
    }
}
//-----------------------------------------------------------------------------
// Sprite_Balloon
//
// The sprite for displaying a balloon icon.

class Sprite_Balloon extends Sprite {
    initialize() {
        super.initialize();
        this.initMembers();
        this.loadBitmap();
    }
    initMembers() {
        this._target = null;
        this._balloonId = 0;
        this._duration = 0;
        this.anchor.x = 0.5;
        this.anchor.y = 1;
        this.z = 7;
    }
    loadBitmap() {
        this.bitmap = ImageManager.loadSystem("Balloon");
        this.setFrame(0, 0, 0, 0);
    }
    setup(targetSprite, balloonId) {
        this._target = targetSprite;
        this._balloonId = balloonId;
        this._duration = 8 * this.speed() + this.waitTime();
    }
    update() {
        if (this._duration > 0) {
            this._duration--;
            if (this._duration > 0) {
                this.updatePosition();
                this.updateFrame();
            }
        }
    }
    updatePosition() {
        this.x = this._target.x;
        this.y = this._target.y - this._target.height;
    }
    updateFrame() {
        const w = 48;
        const h = 48;
        const sx = this.frameIndex() * w;
        const sy = (this._balloonId - 1) * h;
        this.setFrame(sx, sy, w, h);
    }
    speed() {
        return 8;
    }
    waitTime() {
        return 12;
    }
    frameIndex() {
        const index = (this._duration - this.waitTime()) / this.speed();
        return 7 - Math.max(Math.floor(index), 0);
    }
    isPlaying() {
        return this._duration > 0;
    }
}
//-----------------------------------------------------------------------------
// Sprite_Picture
//
// The sprite for displaying a picture.

class Sprite_Picture extends Sprite_Clickable {
    initialize(pictureId) {
        super.initialize();
        this._pictureId = pictureId;
        this._pictureName = "";
    }
    picture() {
        return $gameScreen.picture(this._pictureId);
    }
    update() {
        super.update();
        this.updateBitmap();
        if (this.visible) {
            this.updateOrigin();
            this.updatePosition();
            this.updateScale();
            this.updateTone();
            this.updateOther();
        }
    }
    updateBitmap() {
        const picture = this.picture();
        if (picture) {
            const pictureName = picture.name();
            if (this._pictureName !== pictureName) {
                this._pictureName = pictureName;
                this.loadBitmap();
            }
            this.visible = true;
        } else {
            this._pictureName = "";
            this.bitmap = null;
            this.visible = false;
        }
    }
    updateOrigin() {
        const picture = this.picture();
        if (picture.origin() === 0) {
            this.anchor.x = 0;
            this.anchor.y = 0;
        } else {
            this.anchor.x = 0.5;
            this.anchor.y = 0.5;
        }
    }
    updatePosition() {
        const picture = this.picture();
        this.x = Math.round(picture.x());
        this.y = Math.round(picture.y());
    }
    updateScale() {
        const picture = this.picture();
        this.scale.x = picture.scaleX() / 100;
        this.scale.y = picture.scaleY() / 100;
    }
    updateTone() {
        const picture = this.picture();
        if (picture.tone()) {
            this.setColorTone(picture.tone());
        } else {
            this.setColorTone([0, 0, 0, 0]);
        }
    }
    updateOther() {
        const picture = this.picture();
        this.opacity = picture.opacity();
        this.blendMode = picture.blendMode();
        this.rotation = (picture.angle() * Math.PI) / 180;
    }
    loadBitmap() {
        this.bitmap = ImageManager.loadPicture(this._pictureName);
    }
}
//-----------------------------------------------------------------------------
// Sprite_Timer
//
// The sprite for displaying the timer.

class Sprite_Timer extends Sprite {
    initialize() {
        super.initialize();
        this._seconds = 0;
        this.createBitmap();
        this.update();
    }
    destroy(options) {
        this.bitmap.destroy();
        Sprite.prototype.destroy.call(this, options);
    }
    createBitmap() {
        this.bitmap = new Bitmap(96, 48);
        this.bitmap.fontFace = this.fontFace();
        this.bitmap.fontSize = this.fontSize();
        this.bitmap.outlineColor = ColorManager.outlineColor();
    }
    fontFace() {
        return $gameSystem.numberFontFace();
    }
    fontSize() {
        return $gameSystem.mainFontSize() + 8;
    }
    update() {
        this.updateBitmap();
        this.updatePosition();
        this.updateVisibility();
    }
    updateBitmap() {
        if (this._seconds !== $gameTimer.seconds()) {
            this._seconds = $gameTimer.seconds();
            this.redraw();
        }
    }
    redraw() {
        const text = this.timerText();
        const width = this.bitmap.width;
        const height = this.bitmap.height;
        this.bitmap.clear();
        this.bitmap.drawText(text, 0, 0, width, height, "center");
    }
    timerText() {
        const min = Math.floor(this._seconds / 60) % 60;
        const sec = this._seconds % 60;
        return min.padZero(2) + ":" + sec.padZero(2);
    }
    updatePosition() {
        this.x = (Graphics.width - this.bitmap.width) / 2;
        this.y = 0;
    }
    updateVisibility() {
        this.visible = $gameTimer.isWorking();
    }
}
//-----------------------------------------------------------------------------
// Sprite_Destination
//
// The sprite for displaying the destination place of the touch input.

class Sprite_Destination extends Sprite {
    initialize() {
        super.initialize();
        this.createBitmap();
        this._frameCount = 0;
    }
    destroy(options) {
        if (this.bitmap) {
            this.bitmap.destroy();
        }
        Sprite.prototype.destroy.call(this, options);
    }
    update() {
        if ($gameTemp.isDestinationValid()) {
            this.updatePosition();
            this.updateAnimation();
            this.visible = true;
        } else {
            this._frameCount = 0;
            this.visible = false;
        }
    }
    createBitmap() {
        const tileWidth = $gameMap.tileWidth();
        const tileHeight = $gameMap.tileHeight();
        this.bitmap = new Bitmap(tileWidth, tileHeight);
        this.bitmap.fillAll("white");
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.blendMode = 1;
    }
    updatePosition() {
        const tileWidth = $gameMap.tileWidth();
        const tileHeight = $gameMap.tileHeight();
        const x = $gameTemp.destinationX();
        const y = $gameTemp.destinationY();
        this.x = ($gameMap.adjustX(x) + 0.5) * tileWidth;
        this.y = ($gameMap.adjustY(y) + 0.5) * tileHeight;
    }
    updateAnimation() {
        this._frameCount++;
        this._frameCount %= 20;
        this.opacity = (20 - this._frameCount) * 6;
        this.scale.x = 1 + this._frameCount / 20;
        this.scale.y = this.scale.x;
    }
}
//-----------------------------------------------------------------------------
// Spriteset_Base
//
// The superclass of Spriteset_Map and Spriteset_Battle.

class Spriteset_Base extends PIXI.Container {
    constructor() {
        super();
        this.initialize();
    }
    initialize() {
        this.loadSystemImages();
        this.createLowerLayer();
        this.createUpperLayer();
        this._animationSprites = [];
    }
    destroy(options) {
        this.removeAllAnimations();
        super.destroy(options);
    }
    loadSystemImages() {
        //
    }
    createLowerLayer() {
        this.createBaseSprite();
        this.createBaseFilters();
    }
    createUpperLayer() {
        this.createPictures();
        this.createTimer();
        this.createOverallFilters();
    }
    update() {
        this.updateBaseFilters();
        this.updateOverallFilters();
        this.updatePosition();
        this.updateAnimations();
    }
    createBaseSprite() {
        this._baseSprite = new Sprite();
        this.addChild(this._baseSprite);
    }
    createBaseFilters() {
        this._baseSprite.filters = [];
        this._baseColorFilter = new ColorFilter();
        this._baseSprite.filters.push(this._baseColorFilter);
    }
    createPictures() {
        const rect = this.pictureContainerRect();
        this._pictureContainer = new Sprite();
        this._pictureContainer.setFrame(rect.x, rect.y, rect.width, rect.height);
        for (let i = 1; i <= $gameScreen.maxPictures(); i++) {
            this._pictureContainer.addChild(new Sprite_Picture(i));
        }
        this.addChild(this._pictureContainer);
    }
    pictureContainerRect() {
        return new Rectangle(0, 0, Graphics.width, Graphics.height);
    }
    createTimer() {
        this._timerSprite = new Sprite_Timer();
        this.addChild(this._timerSprite);
    }
    createOverallFilters() {
        this.filters = [];
        this._overallColorFilter = new ColorFilter();
        this.filters.push(this._overallColorFilter);
    }
    updateBaseFilters() {
        const filter = this._baseColorFilter;
        filter.setColorTone($gameScreen.tone());
    }
    updateOverallFilters() {
        const filter = this._overallColorFilter;
        filter.setBlendColor($gameScreen.flashColor());
        filter.setBrightness($gameScreen.brightness());
    }
    updatePosition() {
        const screen = $gameScreen;
        const scale = screen.zoomScale();
        this.scale.x = scale;
        this.scale.y = scale;
        this.x = Math.round(-screen.zoomX() * (scale - 1));
        this.y = Math.round(-screen.zoomY() * (scale - 1));
        this.x += Math.round(screen.shake());
    }
    findTargetSprite( /*target*/) {
        return null;
    }
    updateAnimations() {
        for (const sprite of this._animationSprites) {
            if (!sprite.isPlaying()) {
                this.removeAnimation(sprite);
            }
        }
        this.processAnimationRequests();
    }
    processAnimationRequests() {
        for (; ;) {
            const request = $gameTemp.retrieveAnimation();
            if (request) {
                this.createAnimation(request);
            } else {
                break;
            }
        }
    }
    createAnimation(request) {
        const animation = $dataAnimations[request.animationId];
        const targets = request.targets;
        const mirror = request.mirror;
        let delay = this.animationBaseDelay();
        const nextDelay = this.animationNextDelay();
        if (this.isAnimationForEach(animation)) {
            for (const target of targets) {
                this.createAnimationSprite([target], animation, mirror, delay);
                delay += nextDelay;
            }
        } else {
            this.createAnimationSprite(targets, animation, mirror, delay);
        }
    }
    // prettier-ignore
    createAnimationSprite(targets, animation, mirror, delay) {
        const mv = this.isMVAnimation(animation);
        const sprite = new (mv ? Sprite_AnimationMV : Sprite_Animation)();
        const targetSprites = this.makeTargetSprites(targets);
        const baseDelay = this.animationBaseDelay();
        const previous = delay > baseDelay ? this.lastAnimationSprite() : null;
        if (this.animationShouldMirror(targets[0])) {
            mirror = !mirror;
        }
        sprite.targetObjects = targets;
        sprite.setup(targetSprites, animation, mirror, delay, previous);
        this._effectsContainer.addChild(sprite);
        this._animationSprites.push(sprite);
    }
    isMVAnimation(animation) {
        return !!animation.frames;
    }
    makeTargetSprites(targets) {
        const targetSprites = [];
        for (const target of targets) {
            const targetSprite = this.findTargetSprite(target);
            if (targetSprite) {
                targetSprites.push(targetSprite);
            }
        }
        return targetSprites;
    }
    lastAnimationSprite() {
        return this._animationSprites[this._animationSprites.length - 1];
    }
    isAnimationForEach(animation) {
        const mv = this.isMVAnimation(animation);
        return mv ? animation.position !== 3 : animation.displayType === 0;
    }
    animationBaseDelay() {
        return 8;
    }
    animationNextDelay() {
        return 12;
    }
    animationShouldMirror(target) {
        return target && target.isActor && target.isActor();
    }
    removeAnimation(sprite) {
        this._animationSprites.remove(sprite);
        this._effectsContainer.removeChild(sprite);
        for (const target of sprite.targetObjects) {
            if (target.endAnimation) {
                target.endAnimation();
            }
        }
        sprite.destroy();
    }
    removeAllAnimations() {
        for (const sprite of this._animationSprites.clone()) {
            this.removeAnimation(sprite);
        }
    }
    isAnimationPlaying() {
        return this._animationSprites.length > 0;
    }
}
//-----------------------------------------------------------------------------
// Spriteset_Map
//
// The set of sprites on the map screen.

class Spriteset_Map extends Spriteset_Base {
    initialize() {
        super.initialize();
        this._balloonSprites = [];
    }
    destroy(options) {
        this.removeAllBalloons();
        Spriteset_Base.prototype.destroy.call(this, options);
    }
    loadSystemImages() {
        Spriteset_Base.prototype.loadSystemImages.call(this);
        ImageManager.loadSystem("Balloon");
        ImageManager.loadSystem("Shadow1");
    }
    createLowerLayer() {
        Spriteset_Base.prototype.createLowerLayer.call(this);
        this.createParallax();
        this.createTilemap();
        this.createCharacters();
        this.createShadow();
        this.createDestination();
        this.createWeather();
    }
    update() {
        Spriteset_Base.prototype.update.call(this);
        this.updateTileset();
        this.updateParallax();
        this.updateTilemap();
        this.updateShadow();
        this.updateWeather();
        this.updateAnimations();
        this.updateBalloons();
    }
    hideCharacters() {
        for (const sprite of this._characterSprites) {
            if (!sprite.isTile() && !sprite.isObjectCharacter()) {
                sprite.hide();
            }
        }
    }
    createParallax() {
        this._parallax = new TilingSprite();
        this._parallax.move(0, 0, Graphics.width, Graphics.height);
        this._baseSprite.addChild(this._parallax);
    }
    createTilemap() {
        const tilemap = new Tilemap();
        tilemap.tileWidth = $gameMap.tileWidth();
        tilemap.tileHeight = $gameMap.tileHeight();
        tilemap.setData($gameMap.width(), $gameMap.height(), $gameMap.data());
        tilemap.horizontalWrap = $gameMap.isLoopHorizontal();
        tilemap.verticalWrap = $gameMap.isLoopVertical();
        this._baseSprite.addChild(tilemap);
        this._effectsContainer = tilemap;
        this._tilemap = tilemap;
        this.loadTileset();
    }
    loadTileset() {
        this._tileset = $gameMap.tileset();
        if (this._tileset) {
            const bitmaps = [];
            const tilesetNames = this._tileset.tilesetNames;
            for (const name of tilesetNames) {
                bitmaps.push(ImageManager.loadTileset(name));
            }
            this._tilemap.setBitmaps(bitmaps);
            this._tilemap.flags = $gameMap.tilesetFlags();
        }
    }
    createCharacters() {
        this._characterSprites = [];
        for (const event of $gameMap.events()) {
            this._characterSprites.push(new Sprite_Character(event));
        }
        for (const vehicle of $gameMap.vehicles()) {
            this._characterSprites.push(new Sprite_Character(vehicle));
        }
        for (const follower of $gamePlayer.followers().reverseData()) {
            this._characterSprites.push(new Sprite_Character(follower));
        }
        this._characterSprites.push(new Sprite_Character($gamePlayer));
        for (const sprite of this._characterSprites) {
            this._tilemap.addChild(sprite);
        }
    }
    createShadow() {
        this._shadowSprite = new Sprite();
        this._shadowSprite.bitmap = ImageManager.loadSystem("Shadow1");
        this._shadowSprite.anchor.x = 0.5;
        this._shadowSprite.anchor.y = 1;
        this._shadowSprite.z = 6;
        this._tilemap.addChild(this._shadowSprite);
    }
    createDestination() {
        this._destinationSprite = new Sprite_Destination();
        this._destinationSprite.z = 9;
        this._tilemap.addChild(this._destinationSprite);
    }
    createWeather() {
        this._weather = new Weather();
        this.addChild(this._weather);
    }
    updateTileset() {
        if (this._tileset !== $gameMap.tileset()) {
            this.loadTileset();
        }
    }
    updateParallax() {
        if (this._parallaxName !== $gameMap.parallaxName()) {
            this._parallaxName = $gameMap.parallaxName();
            this._parallax.bitmap = ImageManager.loadParallax(this._parallaxName);
        }
        if (this._parallax.bitmap) {
            const bitmap = this._parallax.bitmap;
            this._parallax.origin.x = $gameMap.parallaxOx() % bitmap.width;
            this._parallax.origin.y = $gameMap.parallaxOy() % bitmap.height;
        }
    }
    updateTilemap() {
        this._tilemap.origin.x = $gameMap.displayX() * $gameMap.tileWidth();
        this._tilemap.origin.y = $gameMap.displayY() * $gameMap.tileHeight();
    }
    updateShadow() {
        const airship = $gameMap.airship();
        this._shadowSprite.x = airship.shadowX();
        this._shadowSprite.y = airship.shadowY();
        this._shadowSprite.opacity = airship.shadowOpacity();
    }
    updateWeather() {
        this._weather.type = $gameScreen.weatherType();
        this._weather.power = $gameScreen.weatherPower();
        this._weather.origin.x = $gameMap.displayX() * $gameMap.tileWidth();
        this._weather.origin.y = $gameMap.displayY() * $gameMap.tileHeight();
    }
    updateBalloons() {
        for (const sprite of this._balloonSprites) {
            if (!sprite.isPlaying()) {
                this.removeBalloon(sprite);
            }
        }
        this.processBalloonRequests();
    }
    processBalloonRequests() {
        for (; ;) {
            const request = $gameTemp.retrieveBalloon();
            if (request) {
                this.createBalloon(request);
            } else {
                break;
            }
        }
    }
    createBalloon(request) {
        const targetSprite = this.findTargetSprite(request.target);
        if (targetSprite) {
            const sprite = new Sprite_Balloon();
            sprite.targetObject = request.target;
            sprite.setup(targetSprite, request.balloonId);
            this._effectsContainer.addChild(sprite);
            this._balloonSprites.push(sprite);
        }
    }
    removeBalloon(sprite) {
        this._balloonSprites.remove(sprite);
        this._effectsContainer.removeChild(sprite);
        if (sprite.targetObject.endBalloon) {
            sprite.targetObject.endBalloon();
        }
        sprite.destroy();
    }
    removeAllBalloons() {
        for (const sprite of this._balloonSprites.clone()) {
            this.removeBalloon(sprite);
        }
    }
    findTargetSprite(target) {
        return this._characterSprites.find(sprite => sprite.checkCharacter(target));
    }
    animationBaseDelay() {
        return 0;
    }
}
//-----------------------------------------------------------------------------
// Spriteset_Battle
//
// The set of sprites on the battle screen.

class Spriteset_Battle extends Spriteset_Base {
    initialize() {
        super.initialize();
        this._battlebackLocated = false;
    }
    loadSystemImages() {
        Spriteset_Base.prototype.loadSystemImages.call(this);
        ImageManager.loadSystem("Shadow2");
        ImageManager.loadSystem("Weapons1");
        ImageManager.loadSystem("Weapons2");
        ImageManager.loadSystem("Weapons3");
    }
    createLowerLayer() {
        Spriteset_Base.prototype.createLowerLayer.call(this);
        this.createBackground();
        this.createBattleback();
        this.createBattleField();
        this.createEnemies();
        this.createActors();
    }
    createBackground() {
        this._backgroundFilter = new PIXI.filters.BlurFilter();
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
        this._backgroundSprite.filters = [this._backgroundFilter];
        this._baseSprite.addChild(this._backgroundSprite);
    }
    createBattleback() {
        this._back1Sprite = new Sprite_Battleback(0);
        this._back2Sprite = new Sprite_Battleback(1);
        this._baseSprite.addChild(this._back1Sprite);
        this._baseSprite.addChild(this._back2Sprite);
    }
    createBattleField() {
        const width = Graphics.boxWidth;
        const height = Graphics.boxHeight;
        const x = (Graphics.width - width) / 2;
        const y = (Graphics.height - height) / 2;
        this._battleField = new Sprite();
        this._battleField.setFrame(0, 0, width, height);
        this._battleField.x = x;
        this._battleField.y = y - this.battleFieldOffsetY();
        this._baseSprite.addChild(this._battleField);
        this._effectsContainer = this._battleField;
    }
    battleFieldOffsetY() {
        return 24;
    }
    update() {
        Spriteset_Base.prototype.update.call(this);
        this.updateActors();
        this.updateBattleback();
        this.updateAnimations();
    }
    updateBattleback() {
        if (!this._battlebackLocated) {
            this._back1Sprite.adjustPosition();
            this._back2Sprite.adjustPosition();
            this._battlebackLocated = true;
        }
    }
    createEnemies() {
        const enemies = $gameTroop.members();
        const sprites = [];
        for (const enemy of enemies) {
            sprites.push(new Sprite_Enemy(enemy));
        }
        sprites.sort(this.compareEnemySprite.bind(this));
        for (const sprite of sprites) {
            this._battleField.addChild(sprite);
        }
        this._enemySprites = sprites;
    }
    compareEnemySprite(a, b) {
        if (a.y !== b.y) {
            return a.y - b.y;
        } else {
            return b.spriteId - a.spriteId;
        }
    }
    createActors() {
        this._actorSprites = [];
        if ($gameSystem.isSideView()) {
            for (let i = 0; i < $gameParty.maxBattleMembers(); i++) {
                const sprite = new Sprite_Actor();
                this._actorSprites.push(sprite);
                this._battleField.addChild(sprite);
            }
        }
    }
    updateActors() {
        const members = $gameParty.battleMembers();
        for (let i = 0; i < this._actorSprites.length; i++) {
            this._actorSprites[i].setBattler(members[i]);
        }
    }
    findTargetSprite(target) {
        return this.battlerSprites().find(sprite => sprite.checkBattler(target));
    }
    battlerSprites() {
        return this._enemySprites.concat(this._actorSprites);
    }
    isEffecting() {
        return this.battlerSprites().some(sprite => sprite.isEffecting());
    }
    isAnyoneMoving() {
        return this.battlerSprites().some(sprite => sprite.isMoving());
    }
    isBusy() {
        return this.isAnimationPlaying() || this.isAnyoneMoving();
    }
}