//=============================================================================
// rmmz_scenes.js v1.8.0
//=============================================================================

//-----------------------------------------------------------------------------
// Scene_Base
//
// The superclass of all scenes within the game.

class Scene_Base extends PIXI.Container {
    constructor(...args) {
        super();
        this.initialize(...args);
    }
    initialize() {
        this._started = false;
        this._active = false;
        this._fadeSign = 0;
        this._fadeDuration = 0;
        this._fadeWhite = 0;
        this._fadeOpacity = 0;
        this.createColorFilter();
    }
    create() {
        //
    }
    isActive() {
        return this._active;
    }
    isReady() {
        return (
            ImageManager.isReady() &&
            EffectManager.isReady() &&
            FontManager.isReady()
        );
    }
    start() {
        this._started = true;
        this._active = true;
    }
    update() {
        this.updateFade();
        this.updateColorFilter();
        this.updateChildren();
        AudioManager.checkErrors();
    }
    stop() {
        this._active = false;
    }
    isStarted() {
        return this._started;
    }
    isBusy() {
        return this.isFading();
    }
    isFading() {
        return this._fadeDuration > 0;
    }
    terminate() {
        //
    }
    createWindowLayer() {
        this._windowLayer = new WindowLayer();
        this._windowLayer.x = (Graphics.width - Graphics.boxWidth) / 2;
        this._windowLayer.y = (Graphics.height - Graphics.boxHeight) / 2;
        this.addChild(this._windowLayer);
    }
    addWindow(window) {
        this._windowLayer.addChild(window);
    }
    startFadeIn(duration, white) {
        this._fadeSign = 1;
        this._fadeDuration = duration || 30;
        this._fadeWhite = white;
        this._fadeOpacity = 255;
        this.updateColorFilter();
    }
    startFadeOut(duration, white) {
        this._fadeSign = -1;
        this._fadeDuration = duration || 30;
        this._fadeWhite = white;
        this._fadeOpacity = 0;
        this.updateColorFilter();
    }
    createColorFilter() {
        this._colorFilter = new ColorFilter();
        this.filters = [this._colorFilter];
    }
    updateColorFilter() {
        const c = this._fadeWhite ? 255 : 0;
        const blendColor = [c, c, c, this._fadeOpacity];
        this._colorFilter.setBlendColor(blendColor);
    }
    updateFade() {
        if (this._fadeDuration > 0) {
            const d = this._fadeDuration;
            if (this._fadeSign > 0) {
                this._fadeOpacity -= this._fadeOpacity / d;
            } else {
                this._fadeOpacity += (255 - this._fadeOpacity) / d;
            }
            this._fadeDuration--;
        }
    }
    updateChildren() {
        for (const child of this.children) {
            if (child.update) {
                child.update();
            }
        }
    }
    popScene() {
        SceneManager.pop();
    }
    checkGameover() {
        if ($gameParty.isAllDead()) {
            SceneManager.goto(Scene_Gameover);
        }
    }
    fadeOutAll() {
        const time = this.slowFadeSpeed() / 60;
        AudioManager.fadeOutBgm(time);
        AudioManager.fadeOutBgs(time);
        AudioManager.fadeOutMe(time);
        this.startFadeOut(this.slowFadeSpeed());
    }
    fadeSpeed() {
        return 24;
    }
    slowFadeSpeed() {
        return this.fadeSpeed() * 2;
    }
    scaleSprite(sprite) {
        const ratioX = Graphics.width / sprite.bitmap.width;
        const ratioY = Graphics.height / sprite.bitmap.height;
        const scale = Math.max(ratioX, ratioY, 1.0);
        sprite.scale.x = scale;
        sprite.scale.y = scale;
    }
    centerSprite(sprite) {
        sprite.x = Graphics.width / 2;
        sprite.y = Graphics.height / 2;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
    }
    isBottomHelpMode() {
        return true;
    }
    isBottomButtonMode() {
        return false;
    }
    isRightInputMode() {
        return true;
    }
    mainCommandWidth() {
        return 240;
    }
    buttonAreaTop() {
        if (this.isBottomButtonMode()) {
            return Graphics.boxHeight - this.buttonAreaHeight();
        } else {
            return 0;
        }
    }
    buttonAreaBottom() {
        return this.buttonAreaTop() + this.buttonAreaHeight();
    }
    buttonAreaHeight() {
        return 52;
    }
    buttonY() {
        const offsetY = Math.floor((this.buttonAreaHeight() - 48) / 2);
        return this.buttonAreaTop() + offsetY;
    }
    calcWindowHeight(numLines, selectable) {
        if (selectable) {
            return Window_Selectable.prototype.fittingHeight(numLines);
        } else {
            return Window_Base.prototype.fittingHeight(numLines);
        }
    }
    requestAutosave() {
        if (this.isAutosaveEnabled()) {
            this.executeAutosave();
        }
    }
    isAutosaveEnabled() {
        return (
            !DataManager.isBattleTest() &&
            !DataManager.isEventTest() &&
            $gameSystem.isAutosaveEnabled() &&
            $gameSystem.isSaveEnabled()
        );
    }
    executeAutosave() {
        $gameSystem.onBeforeSave();
        DataManager.saveGame(0)
            .then(() => this.onAutosaveSuccess())
            .catch(() => this.onAutosaveFailure());
    }
    onAutosaveSuccess() {
        //
    }
    onAutosaveFailure() {
        //
    }
    destroy() {
        super.destroy({ children: true, texture: true });
    }
}
//-----------------------------------------------------------------------------
// Scene_Boot
//
// The scene class for initializing the entire game.

class Scene_Boot extends Scene_Base {
    initialize() {
        super.initialize();
        this._databaseLoaded = false;
    }
    create() {
        Scene_Base.prototype.create.call(this);
        DataManager.loadDatabase();
        StorageManager.updateForageKeys();
    }
    isReady() {
        if (!this._databaseLoaded) {
            if (DataManager.isDatabaseLoaded() &&
                StorageManager.forageKeysUpdated()) {
                this._databaseLoaded = true;
                this.onDatabaseLoaded();
            }
            return false;
        }
        return Scene_Base.prototype.isReady.call(this) && this.isPlayerDataLoaded();
    }
    onDatabaseLoaded() {
        this.setEncryptionInfo();
        this.loadSystemImages();
        this.loadPlayerData();
        this.loadGameFonts();
    }
    setEncryptionInfo() {
        const hasImages = $dataSystem.hasEncryptedImages;
        const hasAudio = $dataSystem.hasEncryptedAudio;
        const key = $dataSystem.encryptionKey;
        Utils.setEncryptionInfo(hasImages, hasAudio, key);
    }
    loadSystemImages() {
        ColorManager.loadWindowskin();
        ImageManager.loadSystem("IconSet");
    }
    loadPlayerData() {
        DataManager.loadGlobalInfo();
        ConfigManager.load();
    }
    loadGameFonts() {
        const advanced = $dataSystem.advanced;
        FontManager.load("rmmz-mainfont", advanced.mainFontFilename);
        FontManager.load("rmmz-numberfont", advanced.numberFontFilename);
    }
    isPlayerDataLoaded() {
        return DataManager.isGlobalInfoLoaded() && ConfigManager.isLoaded();
    }
    start() {
        Scene_Base.prototype.start.call(this);
        SoundManager.preloadImportantSounds();
        if (DataManager.isBattleTest()) {
            DataManager.setupBattleTest();
            SceneManager.goto(Scene_Battle);
        } else if (DataManager.isEventTest()) {
            DataManager.setupEventTest();
            SceneManager.goto(Scene_Map);
        } else if (DataManager.isTitleSkip()) {
            this.checkPlayerLocation();
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
        } else {
            this.startNormalGame();
        }
        this.resizeScreen();
        this.updateDocumentTitle();
    }
    startNormalGame() {
        this.checkPlayerLocation();
        DataManager.setupNewGame();
        Window_TitleCommand.initCommandPosition();
        SceneManager.goto(Scene_Splash);
    }
    resizeScreen() {
        const screenWidth = $dataSystem.advanced.screenWidth;
        const screenHeight = $dataSystem.advanced.screenHeight;
        Graphics.resize(screenWidth, screenHeight);
        Graphics.defaultScale = this.screenScale();
        this.adjustBoxSize();
        this.adjustWindow();
    }
    adjustBoxSize() {
        const uiAreaWidth = $dataSystem.advanced.uiAreaWidth;
        const uiAreaHeight = $dataSystem.advanced.uiAreaHeight;
        const boxMargin = 4;
        Graphics.boxWidth = uiAreaWidth - boxMargin * 2;
        Graphics.boxHeight = uiAreaHeight - boxMargin * 2;
    }
    adjustWindow() {
        if (Utils.isNwjs()) {
            const scale = this.screenScale();
            const xDelta = Graphics.width * scale - window.innerWidth;
            const yDelta = Graphics.height * scale - window.innerHeight;
            window.moveBy(-xDelta / 2, -yDelta / 2);
            window.resizeBy(xDelta, yDelta);
        }
    }
    screenScale() {
        if ("screenScale" in $dataSystem.advanced) {
            return $dataSystem.advanced.screenScale;
        } else {
            return 1;
        }
    }
    updateDocumentTitle() {
        document.title = $dataSystem.gameTitle;
    }
    checkPlayerLocation() {
        if ($dataSystem.startMapId === 0) {
            throw new Error("Player's starting position is not set");
        }
    }
}
//-----------------------------------------------------------------------------
// Scene_Splash
//
// The scene class of the splash screen.

class Scene_Splash extends Scene_Base {
    initialize() {
        super.initialize();
        this.initWaitCount();
    }
    create() {
        Scene_Base.prototype.create.call(this);
        if (this.isEnabled()) {
            this.createBackground();
        }
    }
    start() {
        Scene_Base.prototype.start.call(this);
        if (this.isEnabled()) {
            this.adjustBackground();
            this.startFadeIn(this.fadeSpeed(), false);
        }
    }
    update() {
        Scene_Base.prototype.update.call(this);
        if (this.isActive()) {
            if (!this.updateWaitCount()) {
                this.gotoTitle();
            }
            this.checkSkip();
        }
    }
    stop() {
        Scene_Base.prototype.stop.call(this);
        if (this.isEnabled()) {
            this.startFadeOut(this.fadeSpeed());
        }
    }
    createBackground() {
        this._backSprite = new Sprite();
        this._backSprite.bitmap = ImageManager.loadSystem("Splash");
        this.addChild(this._backSprite);
    }
    adjustBackground() {
        this.scaleSprite(this._backSprite);
        this.centerSprite(this._backSprite);
    }
    isEnabled() {
        return $dataSystem.optSplashScreen;
    }
    initWaitCount() {
        if (this.isEnabled()) {
            this._waitCount = 120;
        } else {
            this._waitCount = 0;
        }
    }
    updateWaitCount() {
        if (this._waitCount > 0) {
            this._waitCount--;
            return true;
        }
        return false;
    }
    checkSkip() {
        if (Input.isTriggered("ok") || TouchInput.isTriggered()) {
            this._waitCount = 0;
        }
    }
    gotoTitle() {
        SceneManager.goto(Scene_Title);
    }
}
//-----------------------------------------------------------------------------
// Scene_Title
//
// The scene class of the title screen.

class Scene_Title extends Scene_Base {
    create() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createForeground();
        this.createWindowLayer();
        this.createCommandWindow();
    }
    start() {
        Scene_Base.prototype.start.call(this);
        SceneManager.clearStack();
        this.adjustBackground();
        this.playTitleMusic();
        this.startFadeIn(this.fadeSpeed(), false);
    }
    update() {
        if (!this.isBusy()) {
            this._commandWindow.open();
        }
        Scene_Base.prototype.update.call(this);
    }
    isBusy() {
        return (
            this._commandWindow.isClosing() ||
            Scene_Base.prototype.isBusy.call(this)
        );
    }
    terminate() {
        Scene_Base.prototype.terminate.call(this);
        SceneManager.snapForBackground();
        if (this._gameTitleSprite) {
            this._gameTitleSprite.bitmap.destroy();
        }
    }
    createBackground() {
        this._backSprite1 = new Sprite(
            ImageManager.loadTitle1($dataSystem.title1Name)
        );
        this._backSprite2 = new Sprite(
            ImageManager.loadTitle2($dataSystem.title2Name)
        );
        this.addChild(this._backSprite1);
        this.addChild(this._backSprite2);
    }
    createForeground() {
        this._gameTitleSprite = new Sprite(
            new Bitmap(Graphics.width, Graphics.height)
        );
        this.addChild(this._gameTitleSprite);
        if ($dataSystem.optDrawTitle) {
            this.drawGameTitle();
        }
    }
    drawGameTitle() {
        const x = 20;
        const y = Graphics.height / 4;
        const maxWidth = Graphics.width - x * 2;
        const text = $dataSystem.gameTitle;
        const bitmap = this._gameTitleSprite.bitmap;
        bitmap.fontFace = $gameSystem.mainFontFace();
        bitmap.outlineColor = "black";
        bitmap.outlineWidth = 8;
        bitmap.fontSize = 72;
        bitmap.drawText(text, x, y, maxWidth, 48, "center");
    }
    adjustBackground() {
        this.scaleSprite(this._backSprite1);
        this.scaleSprite(this._backSprite2);
        this.centerSprite(this._backSprite1);
        this.centerSprite(this._backSprite2);
    }
    createCommandWindow() {
        const background = $dataSystem.titleCommandWindow.background;
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_TitleCommand(rect);
        this._commandWindow.setBackgroundType(background);
        this._commandWindow.setHandler("newGame", this.commandNewGame.bind(this));
        this._commandWindow.setHandler("continue", this.commandContinue.bind(this));
        this._commandWindow.setHandler("options", this.commandOptions.bind(this));
        this.addWindow(this._commandWindow);
    }
    commandWindowRect() {
        const offsetX = $dataSystem.titleCommandWindow.offsetX;
        const offsetY = $dataSystem.titleCommandWindow.offsetY;
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(3, true);
        const wx = (Graphics.boxWidth - ww) / 2 + offsetX;
        const wy = Graphics.boxHeight - wh - 96 + offsetY;
        return new Rectangle(wx, wy, ww, wh);
    }
    commandNewGame() {
        DataManager.setupNewGame();
        this._commandWindow.close();
        this.fadeOutAll();
        SceneManager.goto(Scene_Map);
    }
    commandContinue() {
        this._commandWindow.close();
        SceneManager.push(Scene_Load);
    }
    commandOptions() {
        this._commandWindow.close();
        SceneManager.push(Scene_Options);
    }
    playTitleMusic() {
        AudioManager.playBgm($dataSystem.titleBgm);
        AudioManager.stopBgs();
        AudioManager.stopMe();
    }
}
//-----------------------------------------------------------------------------
// Scene_Message
//
// The superclass of Scene_Map and Scene_Battle.

class Scene_Message extends Scene_Base {
    isMessageWindowClosing() {
        return this._messageWindow.isClosing();
    }
    createAllWindows() {
        this.createMessageWindow();
        this.createScrollTextWindow();
        this.createGoldWindow();
        this.createNameBoxWindow();
        this.createChoiceListWindow();
        this.createNumberInputWindow();
        this.createEventItemWindow();
        this.associateWindows();
    }
    createMessageWindow() {
        const rect = this.messageWindowRect();
        this._messageWindow = new Window_Message(rect);
        this.addWindow(this._messageWindow);
    }
    messageWindowRect() {
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(4, false) + 8;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = 0;
        return new Rectangle(wx, wy, ww, wh);
    }
    createScrollTextWindow() {
        const rect = this.scrollTextWindowRect();
        this._scrollTextWindow = new Window_ScrollText(rect);
        this.addWindow(this._scrollTextWindow);
    }
    scrollTextWindowRect() {
        const wx = 0;
        const wy = 0;
        const ww = Graphics.boxWidth;
        const wh = Graphics.boxHeight;
        return new Rectangle(wx, wy, ww, wh);
    }
    createGoldWindow() {
        const rect = this.goldWindowRect();
        this._goldWindow = new Window_Gold(rect);
        this._goldWindow.openness = 0;
        this.addWindow(this._goldWindow);
    }
    goldWindowRect() {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth - ww;
        const wy = 0;
        return new Rectangle(wx, wy, ww, wh);
    }
    createNameBoxWindow() {
        this._nameBoxWindow = new Window_NameBox();
        this.addWindow(this._nameBoxWindow);
    }
    createChoiceListWindow() {
        this._choiceListWindow = new Window_ChoiceList();
        this.addWindow(this._choiceListWindow);
    }
    createNumberInputWindow() {
        this._numberInputWindow = new Window_NumberInput();
        this.addWindow(this._numberInputWindow);
    }
    createEventItemWindow() {
        const rect = this.eventItemWindowRect();
        this._eventItemWindow = new Window_EventItem(rect);
        this.addWindow(this._eventItemWindow);
    }
    eventItemWindowRect() {
        const wx = 0;
        const wy = 0;
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(4, true);
        return new Rectangle(wx, wy, ww, wh);
    }
    associateWindows() {
        const messageWindow = this._messageWindow;
        messageWindow.setGoldWindow(this._goldWindow);
        messageWindow.setNameBoxWindow(this._nameBoxWindow);
        messageWindow.setChoiceListWindow(this._choiceListWindow);
        messageWindow.setNumberInputWindow(this._numberInputWindow);
        messageWindow.setEventItemWindow(this._eventItemWindow);
        this._nameBoxWindow.setMessageWindow(messageWindow);
        this._choiceListWindow.setMessageWindow(messageWindow);
        this._numberInputWindow.setMessageWindow(messageWindow);
        this._eventItemWindow.setMessageWindow(messageWindow);
    }
    cancelMessageWait() {
        this._messageWindow.cancelWait();
    }
}
//-----------------------------------------------------------------------------
// Scene_Map
//
// The scene class of the map screen.

class Scene_Map extends Scene_Message {
    initialize() {
        super.initialize();
        this._waitCount = 0;
        this._encounterEffectDuration = 0;
        this._mapLoaded = false;
        this._touchCount = 0;
        this._menuEnabled = false;
    }
    create() {
        Scene_Message.prototype.create.call(this);
        this._transfer = $gamePlayer.isTransferring();
        this._lastMapWasNull = !$dataMap;
        if (this._transfer) {
            DataManager.loadMapData($gamePlayer.newMapId());
            this.onTransfer();
        } else {
            DataManager.loadMapData($gameMap.mapId());
        }
    }
    isReady() {
        if (!this._mapLoaded && DataManager.isMapLoaded()) {
            this.onMapLoaded();
            this._mapLoaded = true;
        }
        return this._mapLoaded && Scene_Message.prototype.isReady.call(this);
    }
    onMapLoaded() {
        if (this._transfer) {
            $gamePlayer.performTransfer();
        }
        this.createDisplayObjects();
    }
    onTransfer() {
        ImageManager.clear();
        EffectManager.clear();
    }
    start() {
        Scene_Message.prototype.start.call(this);
        SceneManager.clearStack();
        if (this._transfer) {
            this.fadeInForTransfer();
            this.onTransferEnd();
        } else if (this.needsFadeIn()) {
            this.startFadeIn(this.fadeSpeed(), false);
        }
        this.menuCalling = false;
    }
    onTransferEnd() {
        this._mapNameWindow.open();
        $gameMap.autoplay();
        if (this.shouldAutosave()) {
            this.requestAutosave();
        }
    }
    shouldAutosave() {
        return !this._lastMapWasNull;
    }
    update() {
        Scene_Message.prototype.update.call(this);
        this.updateDestination();
        this.updateMenuButton();
        this.updateMainMultiply();
        if (this.isSceneChangeOk()) {
            this.updateScene();
        } else if (SceneManager.isNextScene(Scene_Battle)) {
            this.updateEncounterEffect();
        }
        this.updateWaitCount();
    }
    updateMainMultiply() {
        if (this.isFastForward()) {
            this.cancelMessageWait();
            this.updateMain();
        }
        this.updateMain();
    }
    updateMain() {
        $gameMap.update(this.isActive());
        $gamePlayer.update(this.isPlayerActive());
        $gameTimer.update(this.isActive());
        $gameScreen.update();
    }
    isPlayerActive() {
        return this.isActive() && !this.isFading();
    }
    isFastForward() {
        return (
            $gameMap.isEventRunning() &&
            !SceneManager.isSceneChanging() &&
            (Input.isLongPressed("ok") || TouchInput.isLongPressed())
        );
    }
    stop() {
        Scene_Message.prototype.stop.call(this);
        $gamePlayer.straighten();
        this._mapNameWindow.close();
        if (this.needsSlowFadeOut()) {
            this.startFadeOut(this.slowFadeSpeed(), false);
        } else if (SceneManager.isNextScene(Scene_Map)) {
            this.fadeOutForTransfer();
        } else if (SceneManager.isNextScene(Scene_Battle)) {
            this.launchBattle();
        }
    }
    isBusy() {
        return (
            this.isMessageWindowClosing() ||
            this._waitCount > 0 ||
            this._encounterEffectDuration > 0 ||
            Scene_Message.prototype.isBusy.call(this)
        );
    }
    terminate() {
        Scene_Message.prototype.terminate.call(this);
        if (!SceneManager.isNextScene(Scene_Battle)) {
            this._spriteset.update();
            this._mapNameWindow.hide();
            this.hideMenuButton();
            SceneManager.snapForBackground();
        }
        $gameScreen.clearZoom();
    }
    needsFadeIn() {
        return (
            SceneManager.isPreviousScene(Scene_Battle) ||
            SceneManager.isPreviousScene(Scene_Load)
        );
    }
    needsSlowFadeOut() {
        return (
            SceneManager.isNextScene(Scene_Title) ||
            SceneManager.isNextScene(Scene_Gameover)
        );
    }
    updateWaitCount() {
        if (this._waitCount > 0) {
            this._waitCount--;
            return true;
        }
        return false;
    }
    updateDestination() {
        if (this.isMapTouchOk()) {
            this.processMapTouch();
        } else {
            $gameTemp.clearDestination();
            this._touchCount = 0;
        }
    }
    updateMenuButton() {
        if (this._menuButton) {
            const menuEnabled = this.isMenuEnabled();
            if (menuEnabled === this._menuEnabled) {
                this._menuButton.visible = this._menuEnabled;
            } else {
                this._menuEnabled = menuEnabled;
            }
        }
    }
    hideMenuButton() {
        if (this._menuButton) {
            this._menuButton.visible = false;
            this._menuEnabled = false;
        }
    }
    isMenuEnabled() {
        return $gameSystem.isMenuEnabled() && !$gameMap.isEventRunning();
    }
    isMapTouchOk() {
        return this.isActive() && $gamePlayer.canMove();
    }
    processMapTouch() {
        if (TouchInput.isTriggered() || this._touchCount > 0) {
            if (TouchInput.isPressed() && !this.isAnyButtonPressed()) {
                if (this._touchCount === 0 || this._touchCount >= 15) {
                    this.onMapTouch();
                }
                this._touchCount++;
            } else {
                this._touchCount = 0;
            }
        }
    }
    isAnyButtonPressed() {
        return this._menuButton && this._menuButton.isPressed();
    }
    onMapTouch() {
        const x = $gameMap.canvasToMapX(TouchInput.x);
        const y = $gameMap.canvasToMapY(TouchInput.y);
        $gameTemp.setDestination(x, y);
    }
    isSceneChangeOk() {
        return this.isActive() && !$gameMessage.isBusy();
    }
    updateScene() {
        this.checkGameover();
        if (!SceneManager.isSceneChanging()) {
            this.updateTransferPlayer();
        }
        if (!SceneManager.isSceneChanging()) {
            this.updateEncounter();
        }
        if (!SceneManager.isSceneChanging()) {
            this.updateCallMenu();
        }
        if (!SceneManager.isSceneChanging()) {
            this.updateCallDebug();
        }
    }
    createDisplayObjects() {
        this.createSpriteset();
        this.createWindowLayer();
        this.createAllWindows();
        this.createButtons();
    }
    createSpriteset() {
        this._spriteset = new Spriteset_Map();
        this.addChild(this._spriteset);
        this._spriteset.update();
    }
    createAllWindows() {
        this.createMapNameWindow();
        Scene_Message.prototype.createAllWindows.call(this);
    }
    createMapNameWindow() {
        const rect = this.mapNameWindowRect();
        this._mapNameWindow = new Window_MapName(rect);
        this.addWindow(this._mapNameWindow);
    }
    mapNameWindowRect() {
        const wx = 0;
        const wy = 0;
        const ww = 360;
        const wh = this.calcWindowHeight(1, false);
        return new Rectangle(wx, wy, ww, wh);
    }
    createButtons() {
        if (ConfigManager.touchUI) {
            this.createMenuButton();
        }
    }
    createMenuButton() {
        this._menuButton = new Sprite_Button("menu");
        this._menuButton.x = Graphics.boxWidth - this._menuButton.width - 4;
        this._menuButton.y = this.buttonY();
        this._menuButton.visible = false;
        this.addWindow(this._menuButton);
    }
    updateTransferPlayer() {
        if ($gamePlayer.isTransferring()) {
            SceneManager.goto(Scene_Map);
        }
    }
    updateEncounter() {
        if ($gamePlayer.executeEncounter()) {
            SceneManager.push(Scene_Battle);
        }
    }
    updateCallMenu() {
        if (this.isMenuEnabled()) {
            if (this.isMenuCalled()) {
                this.menuCalling = true;
            }
            if (this.menuCalling && !$gamePlayer.isMoving()) {
                this.callMenu();
            }
        } else {
            this.menuCalling = false;
        }
    }
    isMenuCalled() {
        return Input.isTriggered("menu") || TouchInput.isCancelled();
    }
    callMenu() {
        SoundManager.playOk();
        SceneManager.push(Scene_Menu);
        Window_MenuCommand.initCommandPosition();
        $gameTemp.clearDestination();
        this._mapNameWindow.hide();
        this._waitCount = 2;
    }
    updateCallDebug() {
        if (this.isDebugCalled()) {
            SceneManager.push(Scene_Debug);
        }
    }
    isDebugCalled() {
        return Input.isTriggered("debug") && $gameTemp.isPlaytest();
    }
    fadeInForTransfer() {
        const fadeType = $gamePlayer.fadeType();
        switch (fadeType) {
            case 0:
            case 1:
                this.startFadeIn(this.fadeSpeed(), fadeType === 1);
                break;
        }
    }
    fadeOutForTransfer() {
        const fadeType = $gamePlayer.fadeType();
        switch (fadeType) {
            case 0:
            case 1:
                this.startFadeOut(this.fadeSpeed(), fadeType === 1);
                break;
        }
    }
    launchBattle() {
        BattleManager.saveBgmAndBgs();
        this.stopAudioOnBattleStart();
        SoundManager.playBattleStart();
        this.startEncounterEffect();
        this._mapNameWindow.hide();
    }
    stopAudioOnBattleStart() {
        if (!AudioManager.isCurrentBgm($gameSystem.battleBgm())) {
            AudioManager.stopBgm();
        }
        AudioManager.stopBgs();
        AudioManager.stopMe();
        AudioManager.stopSe();
    }
    startEncounterEffect() {
        this._spriteset.hideCharacters();
        this._encounterEffectDuration = this.encounterEffectSpeed();
    }
    updateEncounterEffect() {
        if (this._encounterEffectDuration > 0) {
            this._encounterEffectDuration--;
            const speed = this.encounterEffectSpeed();
            const n = speed - this._encounterEffectDuration;
            const p = n / speed;
            const q = ((p - 1) * 20 * p + 5) * p + 1;
            const zoomX = $gamePlayer.screenX();
            const zoomY = $gamePlayer.screenY() - 24;
            if (n === 2) {
                $gameScreen.setZoom(zoomX, zoomY, 1);
                this.snapForBattleBackground();
                this.startFlashForEncounter(speed / 2);
            }
            $gameScreen.setZoom(zoomX, zoomY, q);
            if (n === Math.floor(speed / 6)) {
                this.startFlashForEncounter(speed / 2);
            }
            if (n === Math.floor(speed / 2)) {
                BattleManager.playBattleBgm();
                this.startFadeOut(this.fadeSpeed());
            }
        }
    }
    snapForBattleBackground() {
        this._windowLayer.visible = false;
        SceneManager.snapForBackground();
        this._windowLayer.visible = true;
    }
    startFlashForEncounter(duration) {
        const color = [255, 255, 255, 255];
        $gameScreen.startFlash(color, duration);
    }
    encounterEffectSpeed() {
        return 60;
    }
}
//-----------------------------------------------------------------------------
// Scene_MenuBase
//
// The superclass of all the menu-type scenes.

class Scene_MenuBase extends Scene_Base {
    create() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.updateActor();
        this.createWindowLayer();
        this.createButtons();
    }
    update() {
        Scene_Base.prototype.update.call(this);
        this.updatePageButtons();
    }
    helpAreaTop() {
        if (this.isBottomHelpMode()) {
            return this.mainAreaBottom();
        } else if (this.isBottomButtonMode()) {
            return 0;
        } else {
            return this.buttonAreaBottom();
        }
    }
    helpAreaBottom() {
        return this.helpAreaTop() + this.helpAreaHeight();
    }
    helpAreaHeight() {
        return this.calcWindowHeight(2, false);
    }
    mainAreaTop() {
        if (!this.isBottomHelpMode()) {
            return this.helpAreaBottom();
        } else if (this.isBottomButtonMode()) {
            return 0;
        } else {
            return this.buttonAreaBottom();
        }
    }
    mainAreaBottom() {
        return this.mainAreaTop() + this.mainAreaHeight();
    }
    mainAreaHeight() {
        return Graphics.boxHeight - this.buttonAreaHeight() - this.helpAreaHeight();
    }
    actor() {
        return this._actor;
    }
    updateActor() {
        this._actor = $gameParty.menuActor();
    }
    createBackground() {
        this._backgroundFilter = new PIXI.filters.BlurFilter();
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
        this._backgroundSprite.filters = [this._backgroundFilter];
        this.addChild(this._backgroundSprite);
        this.setBackgroundOpacity(192);
    }
    setBackgroundOpacity(opacity) {
        this._backgroundSprite.opacity = opacity;
    }
    createHelpWindow() {
        const rect = this.helpWindowRect();
        this._helpWindow = new Window_Help(rect);
        this.addWindow(this._helpWindow);
    }
    helpWindowRect() {
        const wx = 0;
        const wy = this.helpAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.helpAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    }
    createButtons() {
        if (ConfigManager.touchUI) {
            if (this.needsCancelButton()) {
                this.createCancelButton();
            }
            if (this.needsPageButtons()) {
                this.createPageButtons();
            }
        }
    }
    needsCancelButton() {
        return true;
    }
    createCancelButton() {
        this._cancelButton = new Sprite_Button("cancel");
        this._cancelButton.x = Graphics.boxWidth - this._cancelButton.width - 4;
        this._cancelButton.y = this.buttonY();
        this.addWindow(this._cancelButton);
    }
    needsPageButtons() {
        return false;
    }
    createPageButtons() {
        this._pageupButton = new Sprite_Button("pageup");
        this._pageupButton.x = 4;
        this._pageupButton.y = this.buttonY();
        const pageupRight = this._pageupButton.x + this._pageupButton.width;
        this._pagedownButton = new Sprite_Button("pagedown");
        this._pagedownButton.x = pageupRight + 4;
        this._pagedownButton.y = this.buttonY();
        this.addWindow(this._pageupButton);
        this.addWindow(this._pagedownButton);
        this._pageupButton.setClickHandler(this.previousActor.bind(this));
        this._pagedownButton.setClickHandler(this.nextActor.bind(this));
    }
    updatePageButtons() {
        if (this._pageupButton && this._pagedownButton) {
            const enabled = this.arePageButtonsEnabled();
            this._pageupButton.visible = enabled;
            this._pagedownButton.visible = enabled;
        }
    }
    arePageButtonsEnabled() {
        return true;
    }
    nextActor() {
        $gameParty.makeMenuActorNext();
        this.updateActor();
        this.onActorChange();
    }
    previousActor() {
        $gameParty.makeMenuActorPrevious();
        this.updateActor();
        this.onActorChange();
    }
    onActorChange() {
        SoundManager.playCursor();
    }
}
//-----------------------------------------------------------------------------
// Scene_Menu
//
// The scene class of the menu screen.

class Scene_Menu extends Scene_MenuBase {
    helpAreaHeight() {
        return 0;
    }
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this.createCommandWindow();
        this.createGoldWindow();
        this.createStatusWindow();
    }
    start() {
        Scene_MenuBase.prototype.start.call(this);
        this._statusWindow.refresh();
    }
    createCommandWindow() {
        const rect = this.commandWindowRect();
        const commandWindow = new Window_MenuCommand(rect);
        commandWindow.setHandler("item", this.commandItem.bind(this));
        commandWindow.setHandler("skill", this.commandPersonal.bind(this));
        commandWindow.setHandler("equip", this.commandPersonal.bind(this));
        commandWindow.setHandler("status", this.commandPersonal.bind(this));
        commandWindow.setHandler("formation", this.commandFormation.bind(this));
        commandWindow.setHandler("options", this.commandOptions.bind(this));
        commandWindow.setHandler("save", this.commandSave.bind(this));
        commandWindow.setHandler("gameEnd", this.commandGameEnd.bind(this));
        commandWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(commandWindow);
        this._commandWindow = commandWindow;
    }
    commandWindowRect() {
        const ww = this.mainCommandWidth();
        const wh = this.mainAreaHeight() - this.goldWindowRect().height;
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    }
    createGoldWindow() {
        const rect = this.goldWindowRect();
        this._goldWindow = new Window_Gold(rect);
        this.addWindow(this._goldWindow);
    }
    goldWindowRect() {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(1, true);
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = this.mainAreaBottom() - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    createStatusWindow() {
        const rect = this.statusWindowRect();
        this._statusWindow = new Window_MenuStatus(rect);
        this.addWindow(this._statusWindow);
    }
    statusWindowRect() {
        const ww = Graphics.boxWidth - this.mainCommandWidth();
        const wh = this.mainAreaHeight();
        const wx = this.isRightInputMode() ? 0 : Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    }
    commandItem() {
        SceneManager.push(Scene_Item);
    }
    commandPersonal() {
        this._statusWindow.setFormationMode(false);
        this._statusWindow.selectLast();
        this._statusWindow.activate();
        this._statusWindow.setHandler("ok", this.onPersonalOk.bind(this));
        this._statusWindow.setHandler("cancel", this.onPersonalCancel.bind(this));
    }
    commandFormation() {
        this._statusWindow.setFormationMode(true);
        this._statusWindow.selectLast();
        this._statusWindow.activate();
        this._statusWindow.setHandler("ok", this.onFormationOk.bind(this));
        this._statusWindow.setHandler("cancel", this.onFormationCancel.bind(this));
    }
    commandOptions() {
        SceneManager.push(Scene_Options);
    }
    commandSave() {
        SceneManager.push(Scene_Save);
    }
    commandGameEnd() {
        SceneManager.push(Scene_GameEnd);
    }
    onPersonalOk() {
        switch (this._commandWindow.currentSymbol()) {
            case "skill":
                SceneManager.push(Scene_Skill);
                break;
            case "equip":
                SceneManager.push(Scene_Equip);
                break;
            case "status":
                SceneManager.push(Scene_Status);
                break;
        }
    }
    onPersonalCancel() {
        this._statusWindow.deselect();
        this._commandWindow.activate();
    }
    onFormationOk() {
        const index = this._statusWindow.index();
        const pendingIndex = this._statusWindow.pendingIndex();
        if (pendingIndex >= 0) {
            $gameParty.swapOrder(index, pendingIndex);
            this._statusWindow.setPendingIndex(-1);
            this._statusWindow.redrawItem(index);
        } else {
            this._statusWindow.setPendingIndex(index);
        }
        this._statusWindow.activate();
    }
    onFormationCancel() {
        if (this._statusWindow.pendingIndex() >= 0) {
            this._statusWindow.setPendingIndex(-1);
            this._statusWindow.activate();
        } else {
            this._statusWindow.deselect();
            this._commandWindow.activate();
        }
    }
}

//-----------------------------------------------------------------------------
// Scene_ItemBase
//
// The superclass of Scene_Item and Scene_Skill.

class Scene_ItemBase extends Scene_MenuBase {
    createActorWindow() {
        const rect = this.actorWindowRect();
        this._actorWindow = new Window_MenuActor(rect);
        this._actorWindow.setHandler("ok", this.onActorOk.bind(this));
        this._actorWindow.setHandler("cancel", this.onActorCancel.bind(this));
        this.addWindow(this._actorWindow);
    }
    actorWindowRect() {
        const wx = 0;
        const wy = Math.min(this.mainAreaTop(), this.helpAreaTop());
        const ww = Graphics.boxWidth - this.mainCommandWidth();
        const wh = this.mainAreaHeight() + this.helpAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    }
    item() {
        return this._itemWindow.item();
    }
    user() {
        return null;
    }
    isCursorLeft() {
        return this._itemWindow.index() % 2 === 0;
    }
    showActorWindow() {
        if (this.isCursorLeft()) {
            this._actorWindow.x = Graphics.boxWidth - this._actorWindow.width;
        } else {
            this._actorWindow.x = 0;
        }
        this._actorWindow.show();
        this._actorWindow.activate();
    }
    hideActorWindow() {
        this._actorWindow.hide();
        this._actorWindow.deactivate();
    }
    isActorWindowActive() {
        return this._actorWindow && this._actorWindow.active;
    }
    onActorOk() {
        if (this.canUse()) {
            this.useItem();
        } else {
            SoundManager.playBuzzer();
        }
    }
    onActorCancel() {
        this.hideActorWindow();
        this.activateItemWindow();
    }
    determineItem() {
        const action = new Game_Action(this.user());
        const item = this.item();
        action.setItemObject(item);
        if (action.isForFriend()) {
            this.showActorWindow();
            this._actorWindow.selectForItem(this.item());
        } else {
            this.useItem();
            this.activateItemWindow();
        }
    }
    useItem() {
        this.playSeForItem();
        this.user().useItem(this.item());
        this.applyItem();
        this.checkCommonEvent();
        this.checkGameover();
        this._actorWindow.refresh();
    }
    activateItemWindow() {
        this._itemWindow.refresh();
        this._itemWindow.activate();
    }
    itemTargetActors() {
        const action = new Game_Action(this.user());
        action.setItemObject(this.item());
        if (!action.isForFriend()) {
            return [];
        } else if (action.isForAll()) {
            return $gameParty.members();
        } else {
            return [$gameParty.members()[this._actorWindow.index()]];
        }
    }
    canUse() {
        const user = this.user();
        return user && user.canUse(this.item()) && this.isItemEffectsValid();
    }
    isItemEffectsValid() {
        const action = new Game_Action(this.user());
        action.setItemObject(this.item());
        return this.itemTargetActors().some(target => action.testApply(target));
    }
    applyItem() {
        const action = new Game_Action(this.user());
        action.setItemObject(this.item());
        for (const target of this.itemTargetActors()) {
            for (let i = 0; i < action.numRepeats(); i++) {
                action.apply(target);
            }
        }
        action.applyGlobal();
    }
    checkCommonEvent() {
        if ($gameTemp.isCommonEventReserved()) {
            SceneManager.goto(Scene_Map);
        }
    }
}
//-----------------------------------------------------------------------------
// Scene_Item
//
// The scene class of the item screen.

class Scene_Item extends Scene_ItemBase {
    create() {
        Scene_ItemBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createCategoryWindow();
        this.createItemWindow();
        this.createActorWindow();
    }
    createCategoryWindow() {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_ItemCategory(rect);
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    }
    categoryWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    }
    createItemWindow() {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_ItemList(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);
        if (!this._categoryWindow.needsSelection()) {
            this._itemWindow.y -= this._categoryWindow.height;
            this._itemWindow.height += this._categoryWindow.height;
            this._itemWindow.createContents();
            this._categoryWindow.update();
            this._categoryWindow.hide();
            this._categoryWindow.deactivate();
            this.onCategoryOk();
        }
    }
    itemWindowRect() {
        const wx = 0;
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(wx, wy, ww, wh);
    }
    user() {
        const members = $gameParty.movableMembers();
        const bestPha = Math.max(...members.map(member => member.pha));
        return members.find(member => member.pha === bestPha);
    }
    onCategoryOk() {
        this._itemWindow.activate();
        this._itemWindow.selectLast();
    }
    onItemOk() {
        $gameParty.setLastItem(this.item());
        this.determineItem();
    }
    onItemCancel() {
        if (this._categoryWindow.needsSelection()) {
            this._itemWindow.deselect();
            this._categoryWindow.activate();
        } else {
            this.popScene();
        }
    }
    playSeForItem() {
        SoundManager.playUseItem();
    }
    useItem() {
        Scene_ItemBase.prototype.useItem.call(this);
        this._itemWindow.redrawCurrentItem();
    }
}
//-----------------------------------------------------------------------------
// Scene_Skill
//
// The scene class of the skill screen.

class Scene_Skill extends Scene_ItemBase {
    create() {
        Scene_ItemBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createSkillTypeWindow();
        this.createStatusWindow();
        this.createItemWindow();
        this.createActorWindow();
    }
    start() {
        Scene_ItemBase.prototype.start.call(this);
        this.refreshActor();
    }
    createSkillTypeWindow() {
        const rect = this.skillTypeWindowRect();
        this._skillTypeWindow = new Window_SkillType(rect);
        this._skillTypeWindow.setHelpWindow(this._helpWindow);
        this._skillTypeWindow.setHandler("skill", this.commandSkill.bind(this));
        this._skillTypeWindow.setHandler("cancel", this.popScene.bind(this));
        this._skillTypeWindow.setHandler("pagedown", this.nextActor.bind(this));
        this._skillTypeWindow.setHandler("pageup", this.previousActor.bind(this));
        this.addWindow(this._skillTypeWindow);
    }
    skillTypeWindowRect() {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(3, true);
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    }
    createStatusWindow() {
        const rect = this.statusWindowRect();
        this._statusWindow = new Window_SkillStatus(rect);
        this.addWindow(this._statusWindow);
    }
    statusWindowRect() {
        const ww = Graphics.boxWidth - this.mainCommandWidth();
        const wh = this._skillTypeWindow.height;
        const wx = this.isRightInputMode() ? 0 : Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    }
    createItemWindow() {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_SkillList(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this._skillTypeWindow.setSkillWindow(this._itemWindow);
        this.addWindow(this._itemWindow);
    }
    itemWindowRect() {
        const wx = 0;
        const wy = this._statusWindow.y + this._statusWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaHeight() - this._statusWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    }
    needsPageButtons() {
        return true;
    }
    arePageButtonsEnabled() {
        return !this.isActorWindowActive();
    }
    refreshActor() {
        const actor = this.actor();
        this._skillTypeWindow.setActor(actor);
        this._statusWindow.setActor(actor);
        this._itemWindow.setActor(actor);
    }
    user() {
        return this.actor();
    }
    commandSkill() {
        this._itemWindow.activate();
        this._itemWindow.selectLast();
    }
    onItemOk() {
        this.actor().setLastMenuSkill(this.item());
        this.determineItem();
    }
    onItemCancel() {
        this._itemWindow.deselect();
        this._skillTypeWindow.activate();
    }
    playSeForItem() {
        SoundManager.playUseSkill();
    }
    useItem() {
        Scene_ItemBase.prototype.useItem.call(this);
        this._statusWindow.refresh();
        this._itemWindow.refresh();
    }
    onActorChange() {
        Scene_MenuBase.prototype.onActorChange.call(this);
        this.refreshActor();
        this._itemWindow.deselect();
        this._skillTypeWindow.activate();
    }
}
//-----------------------------------------------------------------------------
// Scene_Equip
//
// The scene class of the equipment screen.

class Scene_Equip extends Scene_MenuBase {
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createStatusWindow();
        this.createCommandWindow();
        this.createSlotWindow();
        this.createItemWindow();
        this.refreshActor();
    }
    createStatusWindow() {
        const rect = this.statusWindowRect();
        this._statusWindow = new Window_EquipStatus(rect);
        this.addWindow(this._statusWindow);
    }
    statusWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = this.statusWidth();
        const wh = this.mainAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    }
    createCommandWindow() {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_EquipCommand(rect);
        this._commandWindow.setHelpWindow(this._helpWindow);
        this._commandWindow.setHandler("equip", this.commandEquip.bind(this));
        this._commandWindow.setHandler("optimize", this.commandOptimize.bind(this));
        this._commandWindow.setHandler("clear", this.commandClear.bind(this));
        this._commandWindow.setHandler("cancel", this.popScene.bind(this));
        this._commandWindow.setHandler("pagedown", this.nextActor.bind(this));
        this._commandWindow.setHandler("pageup", this.previousActor.bind(this));
        this.addWindow(this._commandWindow);
    }
    commandWindowRect() {
        const wx = this.statusWidth();
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth - this.statusWidth();
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    }
    createSlotWindow() {
        const rect = this.slotWindowRect();
        this._slotWindow = new Window_EquipSlot(rect);
        this._slotWindow.setHelpWindow(this._helpWindow);
        this._slotWindow.setStatusWindow(this._statusWindow);
        this._slotWindow.setHandler("ok", this.onSlotOk.bind(this));
        this._slotWindow.setHandler("cancel", this.onSlotCancel.bind(this));
        this.addWindow(this._slotWindow);
    }
    slotWindowRect() {
        const commandWindowRect = this.commandWindowRect();
        const wx = this.statusWidth();
        const wy = commandWindowRect.y + commandWindowRect.height;
        const ww = Graphics.boxWidth - this.statusWidth();
        const wh = this.mainAreaHeight() - commandWindowRect.height;
        return new Rectangle(wx, wy, ww, wh);
    }
    createItemWindow() {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_EquipItem(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setStatusWindow(this._statusWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this._itemWindow.hide();
        this._slotWindow.setItemWindow(this._itemWindow);
        this.addWindow(this._itemWindow);
    }
    itemWindowRect() {
        return this.slotWindowRect();
    }
    statusWidth() {
        return 312;
    }
    needsPageButtons() {
        return true;
    }
    arePageButtonsEnabled() {
        return !(this._itemWindow && this._itemWindow.active);
    }
    refreshActor() {
        const actor = this.actor();
        this._statusWindow.setActor(actor);
        this._slotWindow.setActor(actor);
        this._itemWindow.setActor(actor);
    }
    commandEquip() {
        this._slotWindow.activate();
        this._slotWindow.select(0);
    }
    commandOptimize() {
        SoundManager.playEquip();
        this.actor().optimizeEquipments();
        this._statusWindow.refresh();
        this._slotWindow.refresh();
        this._commandWindow.activate();
    }
    commandClear() {
        SoundManager.playEquip();
        this.actor().clearEquipments();
        this._statusWindow.refresh();
        this._slotWindow.refresh();
        this._commandWindow.activate();
    }
    onSlotOk() {
        this._slotWindow.hide();
        this._itemWindow.show();
        this._itemWindow.activate();
        this._itemWindow.select(0);
    }
    onSlotCancel() {
        this._slotWindow.deselect();
        this._commandWindow.activate();
    }
    onItemOk() {
        SoundManager.playEquip();
        this.executeEquipChange();
        this.hideItemWindow();
        this._slotWindow.refresh();
        this._itemWindow.refresh();
        this._statusWindow.refresh();
    }
    executeEquipChange() {
        const actor = this.actor();
        const slotId = this._slotWindow.index();
        const item = this._itemWindow.item();
        actor.changeEquip(slotId, item);
    }
    onItemCancel() {
        this.hideItemWindow();
    }
    onActorChange() {
        Scene_MenuBase.prototype.onActorChange.call(this);
        this.refreshActor();
        this.hideItemWindow();
        this._slotWindow.deselect();
        this._slotWindow.deactivate();
        this._commandWindow.activate();
    }
    hideItemWindow() {
        this._slotWindow.show();
        this._slotWindow.activate();
        this._itemWindow.hide();
        this._itemWindow.deselect();
    }
}
//-----------------------------------------------------------------------------
// Scene_Status
//
// The scene class of the status screen.

class Scene_Status extends Scene_MenuBase {
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this.createProfileWindow();
        this.createStatusWindow();
        this.createStatusParamsWindow();
        this.createStatusEquipWindow();
    }
    helpAreaHeight() {
        return 0;
    }
    createProfileWindow() {
        const rect = this.profileWindowRect();
        this._profileWindow = new Window_Help(rect);
        this.addWindow(this._profileWindow);
    }
    profileWindowRect() {
        const ww = Graphics.boxWidth;
        const wh = this.profileHeight();
        const wx = 0;
        const wy = this.mainAreaBottom() - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    createStatusWindow() {
        const rect = this.statusWindowRect();
        this._statusWindow = new Window_Status(rect);
        this._statusWindow.setHandler("cancel", this.popScene.bind(this));
        this._statusWindow.setHandler("pagedown", this.nextActor.bind(this));
        this._statusWindow.setHandler("pageup", this.previousActor.bind(this));
        this.addWindow(this._statusWindow);
    }
    statusWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.statusParamsWindowRect().y - wy;
        return new Rectangle(wx, wy, ww, wh);
    }
    createStatusParamsWindow() {
        const rect = this.statusParamsWindowRect();
        this._statusParamsWindow = new Window_StatusParams(rect);
        this.addWindow(this._statusParamsWindow);
    }
    statusParamsWindowRect() {
        const ww = this.statusParamsWidth();
        const wh = this.statusParamsHeight();
        const wx = 0;
        const wy = this.mainAreaBottom() - this.profileHeight() - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    createStatusEquipWindow() {
        const rect = this.statusEquipWindowRect();
        this._statusEquipWindow = new Window_StatusEquip(rect);
        this.addWindow(this._statusEquipWindow);
    }
    statusEquipWindowRect() {
        const ww = Graphics.boxWidth - this.statusParamsWidth();
        const wh = this.statusParamsHeight();
        const wx = this.statusParamsWidth();
        const wy = this.mainAreaBottom() - this.profileHeight() - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    statusParamsWidth() {
        return 300;
    }
    statusParamsHeight() {
        return this.calcWindowHeight(6, false);
    }
    profileHeight() {
        return this.calcWindowHeight(2, false);
    }
    start() {
        Scene_MenuBase.prototype.start.call(this);
        this.refreshActor();
    }
    needsPageButtons() {
        return true;
    }
    refreshActor() {
        const actor = this.actor();
        this._profileWindow.setText(actor.profile());
        this._statusWindow.setActor(actor);
        this._statusParamsWindow.setActor(actor);
        this._statusEquipWindow.setActor(actor);
    }
    onActorChange() {
        Scene_MenuBase.prototype.onActorChange.call(this);
        this.refreshActor();
        this._statusWindow.activate();
    }
}
//-----------------------------------------------------------------------------
// Scene_Options
//
// The scene class of the options screen.

class Scene_Options extends Scene_MenuBase {
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this.createOptionsWindow();
    }
    terminate() {
        Scene_MenuBase.prototype.terminate.call(this);
        ConfigManager.save();
    }
    createOptionsWindow() {
        const rect = this.optionsWindowRect();
        this._optionsWindow = new Window_Options(rect);
        this._optionsWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._optionsWindow);
    }
    optionsWindowRect() {
        const n = Math.min(this.maxCommands(), this.maxVisibleCommands());
        const ww = 400;
        const wh = this.calcWindowHeight(n, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        return new Rectangle(wx, wy, ww, wh);
    }
    maxCommands() {
        // Increase this value when adding option items.
        return 7;
    }
    maxVisibleCommands() {
        return 12;
    }
}
//-----------------------------------------------------------------------------
// Scene_File
//
// The superclass of Scene_Save and Scene_Load.

class Scene_File extends Scene_MenuBase {
    create() {
        Scene_MenuBase.prototype.create.call(this);
        DataManager.loadAllSavefileImages();
        this.createHelpWindow();
        this.createListWindow();
        this._helpWindow.setText(this.helpWindowText());
    }
    helpAreaHeight() {
        return 0;
    }
    start() {
        Scene_MenuBase.prototype.start.call(this);
        this._listWindow.refresh();
    }
    savefileId() {
        return this._listWindow.savefileId();
    }
    isSavefileEnabled(savefileId) {
        return this._listWindow.isEnabled(savefileId);
    }
    createHelpWindow() {
        const rect = this.helpWindowRect();
        this._helpWindow = new Window_Help(rect);
        this.addWindow(this._helpWindow);
    }
    helpWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, false);
        return new Rectangle(wx, wy, ww, wh);
    }
    createListWindow() {
        const rect = this.listWindowRect();
        this._listWindow = new Window_SavefileList(rect);
        this._listWindow.setHandler("ok", this.onSavefileOk.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this._listWindow.setMode(this.mode(), this.needsAutosave());
        this._listWindow.selectSavefile(this.firstSavefileId());
        this._listWindow.refresh();
        this.addWindow(this._listWindow);
    }
    listWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop() + this._helpWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaHeight() - this._helpWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    }
    mode() {
        return null;
    }
    needsAutosave() {
        return $gameSystem.isAutosaveEnabled();
    }
    activateListWindow() {
        this._listWindow.activate();
    }
    helpWindowText() {
        return "";
    }
    firstSavefileId() {
        return 0;
    }
    onSavefileOk() {
        //
    }
}
//-----------------------------------------------------------------------------
// Scene_Save
//
// The scene class of the save screen.

class Scene_Save extends Scene_File {
    mode() {
        return "save";
    }
    helpWindowText() {
        return TextManager.saveMessage;
    }
    firstSavefileId() {
        return $gameSystem.savefileId();
    }
    onSavefileOk() {
        Scene_File.prototype.onSavefileOk.call(this);
        const savefileId = this.savefileId();
        if (this.isSavefileEnabled(savefileId)) {
            this.executeSave(savefileId);
        } else {
            this.onSaveFailure();
        }
    }
    executeSave(savefileId) {
        $gameSystem.setSavefileId(savefileId);
        $gameSystem.onBeforeSave();
        DataManager.saveGame(savefileId)
            .then(() => this.onSaveSuccess())
            .catch(() => this.onSaveFailure());
    }
    onSaveSuccess() {
        SoundManager.playSave();
        this.popScene();
    }
    onSaveFailure() {
        SoundManager.playBuzzer();
        this.activateListWindow();
    }
}
//-----------------------------------------------------------------------------
// Scene_Load
//
// The scene class of the load screen.

class Scene_Load extends Scene_File {
    initialize() {
        super.initialize();
        this._loadSuccess = false;
    }
    terminate() {
        Scene_File.prototype.terminate.call(this);
        if (this._loadSuccess) {
            $gameSystem.onAfterLoad();
        }
    }
    mode() {
        return "load";
    }
    helpWindowText() {
        return TextManager.loadMessage;
    }
    firstSavefileId() {
        return DataManager.latestSavefileId();
    }
    onSavefileOk() {
        Scene_File.prototype.onSavefileOk.call(this);
        const savefileId = this.savefileId();
        if (this.isSavefileEnabled(savefileId)) {
            this.executeLoad(savefileId);
        } else {
            this.onLoadFailure();
        }
    }
    executeLoad(savefileId) {
        DataManager.loadGame(savefileId)
            .then(() => this.onLoadSuccess())
            .catch(() => this.onLoadFailure());
    }
    onLoadSuccess() {
        SoundManager.playLoad();
        this.fadeOutAll();
        this.reloadMapIfUpdated();
        SceneManager.goto(Scene_Map);
        this._loadSuccess = true;
    }
    onLoadFailure() {
        SoundManager.playBuzzer();
        this.activateListWindow();
    }
    reloadMapIfUpdated() {
        if ($gameSystem.versionId() !== $dataSystem.versionId) {
            const mapId = $gameMap.mapId();
            const x = $gamePlayer.x;
            const y = $gamePlayer.y;
            const d = $gamePlayer.direction();
            $gamePlayer.reserveTransfer(mapId, x, y, d, 0);
            $gamePlayer.requestMapReload();
        }
    }
}
//-----------------------------------------------------------------------------
// Scene_GameEnd
//
// The scene class of the game end screen.

class Scene_GameEnd extends Scene_MenuBase {
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this.createCommandWindow();
    }
    stop() {
        Scene_MenuBase.prototype.stop.call(this);
        this._commandWindow.close();
    }
    createBackground() {
        Scene_MenuBase.prototype.createBackground.call(this);
        this.setBackgroundOpacity(128);
    }
    createCommandWindow() {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_GameEnd(rect);
        this._commandWindow.setHandler("toTitle", this.commandToTitle.bind(this));
        this._commandWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._commandWindow);
    }
    commandWindowRect() {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(2, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        return new Rectangle(wx, wy, ww, wh);
    }
    commandToTitle() {
        this.fadeOutAll();
        SceneManager.goto(Scene_Title);
        Window_TitleCommand.initCommandPosition();
    }
}
//-----------------------------------------------------------------------------
// Scene_Shop
//
// The scene class of the shop screen.

class Scene_Shop extends Scene_MenuBase {
    prepare(goods, purchaseOnly) {
        this._goods = goods;
        this._purchaseOnly = purchaseOnly;
        this._item = null;
    }
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createGoldWindow();
        this.createCommandWindow();
        this.createDummyWindow();
        this.createNumberWindow();
        this.createStatusWindow();
        this.createBuyWindow();
        this.createCategoryWindow();
        this.createSellWindow();
    }
    createGoldWindow() {
        const rect = this.goldWindowRect();
        this._goldWindow = new Window_Gold(rect);
        this.addWindow(this._goldWindow);
    }
    goldWindowRect() {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    }
    createCommandWindow() {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_ShopCommand(rect);
        this._commandWindow.setPurchaseOnly(this._purchaseOnly);
        this._commandWindow.y = this.mainAreaTop();
        this._commandWindow.setHandler("buy", this.commandBuy.bind(this));
        this._commandWindow.setHandler("sell", this.commandSell.bind(this));
        this._commandWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._commandWindow);
    }
    commandWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = this._goldWindow.x;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    }
    createDummyWindow() {
        const rect = this.dummyWindowRect();
        this._dummyWindow = new Window_Base(rect);
        this.addWindow(this._dummyWindow);
    }
    dummyWindowRect() {
        const wx = 0;
        const wy = this._commandWindow.y + this._commandWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaHeight() - this._commandWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    }
    createNumberWindow() {
        const rect = this.numberWindowRect();
        this._numberWindow = new Window_ShopNumber(rect);
        this._numberWindow.hide();
        this._numberWindow.setHandler("ok", this.onNumberOk.bind(this));
        this._numberWindow.setHandler("cancel", this.onNumberCancel.bind(this));
        this.addWindow(this._numberWindow);
    }
    numberWindowRect() {
        const wx = 0;
        const wy = this._dummyWindow.y;
        const ww = Graphics.boxWidth - this.statusWidth();
        const wh = this._dummyWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    }
    createStatusWindow() {
        const rect = this.statusWindowRect();
        this._statusWindow = new Window_ShopStatus(rect);
        this._statusWindow.hide();
        this.addWindow(this._statusWindow);
    }
    statusWindowRect() {
        const ww = this.statusWidth();
        const wh = this._dummyWindow.height;
        const wx = Graphics.boxWidth - ww;
        const wy = this._dummyWindow.y;
        return new Rectangle(wx, wy, ww, wh);
    }
    createBuyWindow() {
        const rect = this.buyWindowRect();
        this._buyWindow = new Window_ShopBuy(rect);
        this._buyWindow.setupGoods(this._goods);
        this._buyWindow.setHelpWindow(this._helpWindow);
        this._buyWindow.setStatusWindow(this._statusWindow);
        this._buyWindow.hide();
        this._buyWindow.setHandler("ok", this.onBuyOk.bind(this));
        this._buyWindow.setHandler("cancel", this.onBuyCancel.bind(this));
        this.addWindow(this._buyWindow);
    }
    buyWindowRect() {
        const wx = 0;
        const wy = this._dummyWindow.y;
        const ww = Graphics.boxWidth - this.statusWidth();
        const wh = this._dummyWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    }
    createCategoryWindow() {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_ItemCategory(rect);
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._categoryWindow.hide();
        this._categoryWindow.deactivate();
        this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.onCategoryCancel.bind(this));
        this.addWindow(this._categoryWindow);
    }
    categoryWindowRect() {
        const wx = 0;
        const wy = this._dummyWindow.y;
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    }
    createSellWindow() {
        const rect = this.sellWindowRect();
        this._sellWindow = new Window_ShopSell(rect);
        this._sellWindow.setHelpWindow(this._helpWindow);
        this._sellWindow.hide();
        this._sellWindow.setHandler("ok", this.onSellOk.bind(this));
        this._sellWindow.setHandler("cancel", this.onSellCancel.bind(this));
        this._categoryWindow.setItemWindow(this._sellWindow);
        this.addWindow(this._sellWindow);
        if (!this._categoryWindow.needsSelection()) {
            this._sellWindow.y -= this._categoryWindow.height;
            this._sellWindow.height += this._categoryWindow.height;
        }
    }
    sellWindowRect() {
        const wx = 0;
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaHeight() -
            this._commandWindow.height -
            this._categoryWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    }
    statusWidth() {
        return 352;
    }
    activateBuyWindow() {
        this._buyWindow.setMoney(this.money());
        this._buyWindow.show();
        this._buyWindow.activate();
        this._statusWindow.show();
    }
    activateSellWindow() {
        if (this._categoryWindow.needsSelection()) {
            this._categoryWindow.show();
        }
        this._sellWindow.refresh();
        this._sellWindow.show();
        this._sellWindow.activate();
        this._statusWindow.hide();
    }
    commandBuy() {
        this._dummyWindow.hide();
        this.activateBuyWindow();
    }
    commandSell() {
        this._dummyWindow.hide();
        this._sellWindow.show();
        this._sellWindow.deselect();
        this._sellWindow.refresh();
        if (this._categoryWindow.needsSelection()) {
            this._categoryWindow.show();
            this._categoryWindow.activate();
        } else {
            this.onCategoryOk();
        }
    }
    onBuyOk() {
        this._item = this._buyWindow.item();
        this._buyWindow.hide();
        this._numberWindow.setup(this._item, this.maxBuy(), this.buyingPrice());
        this._numberWindow.setCurrencyUnit(this.currencyUnit());
        this._numberWindow.show();
        this._numberWindow.activate();
    }
    onBuyCancel() {
        this._commandWindow.activate();
        this._dummyWindow.show();
        this._buyWindow.hide();
        this._statusWindow.hide();
        this._statusWindow.setItem(null);
        this._helpWindow.clear();
    }
    onCategoryOk() {
        this.activateSellWindow();
        this._sellWindow.select(0);
    }
    onCategoryCancel() {
        this._commandWindow.activate();
        this._dummyWindow.show();
        this._categoryWindow.hide();
        this._sellWindow.hide();
    }
    onSellOk() {
        this._item = this._sellWindow.item();
        this._categoryWindow.hide();
        this._sellWindow.hide();
        this._numberWindow.setup(this._item, this.maxSell(), this.sellingPrice());
        this._numberWindow.setCurrencyUnit(this.currencyUnit());
        this._numberWindow.show();
        this._numberWindow.activate();
        this._statusWindow.setItem(this._item);
        this._statusWindow.show();
    }
    onSellCancel() {
        this._sellWindow.deselect();
        this._statusWindow.setItem(null);
        this._helpWindow.clear();
        if (this._categoryWindow.needsSelection()) {
            this._categoryWindow.activate();
        } else {
            this.onCategoryCancel();
        }
    }
    onNumberOk() {
        SoundManager.playShop();
        switch (this._commandWindow.currentSymbol()) {
            case "buy":
                this.doBuy(this._numberWindow.number());
                break;
            case "sell":
                this.doSell(this._numberWindow.number());
                break;
        }
        this.endNumberInput();
        this._goldWindow.refresh();
        this._statusWindow.refresh();
    }
    onNumberCancel() {
        SoundManager.playCancel();
        this.endNumberInput();
    }
    doBuy(number) {
        $gameParty.loseGold(number * this.buyingPrice());
        $gameParty.gainItem(this._item, number);
    }
    doSell(number) {
        $gameParty.gainGold(number * this.sellingPrice());
        $gameParty.loseItem(this._item, number);
    }
    endNumberInput() {
        this._numberWindow.hide();
        switch (this._commandWindow.currentSymbol()) {
            case "buy":
                this.activateBuyWindow();
                break;
            case "sell":
                this.activateSellWindow();
                break;
        }
    }
    maxBuy() {
        const num = $gameParty.numItems(this._item);
        const max = $gameParty.maxItems(this._item) - num;
        const price = this.buyingPrice();
        if (price > 0) {
            return Math.min(max, Math.floor(this.money() / price));
        } else {
            return max;
        }
    }
    maxSell() {
        return $gameParty.numItems(this._item);
    }
    money() {
        return this._goldWindow.value();
    }
    currencyUnit() {
        return this._goldWindow.currencyUnit();
    }
    buyingPrice() {
        return this._buyWindow.price(this._item);
    }
    sellingPrice() {
        return Math.floor(this._item.price / 2);
    }
}
//-----------------------------------------------------------------------------
// Scene_Name
//
// The scene class of the name input screen.

class Scene_Name extends Scene_MenuBase {
    prepare(actorId, maxLength) {
        this._actorId = actorId;
        this._maxLength = maxLength;
    }
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this._actor = $gameActors.actor(this._actorId);
        this.createEditWindow();
        this.createInputWindow();
    }
    start() {
        Scene_MenuBase.prototype.start.call(this);
        this._editWindow.refresh();
    }
    createEditWindow() {
        const rect = this.editWindowRect();
        this._editWindow = new Window_NameEdit(rect);
        this._editWindow.setup(this._actor, this._maxLength);
        this.addWindow(this._editWindow);
    }
    editWindowRect() {
        const inputWindowHeight = this.calcWindowHeight(9, true);
        const padding = $gameSystem.windowPadding();
        const ww = 600;
        const wh = ImageManager.faceHeight + padding * 2;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - (wh + inputWindowHeight + 8)) / 2;
        return new Rectangle(wx, wy, ww, wh);
    }
    createInputWindow() {
        const rect = this.inputWindowRect();
        this._inputWindow = new Window_NameInput(rect);
        this._inputWindow.setEditWindow(this._editWindow);
        this._inputWindow.setHandler("ok", this.onInputOk.bind(this));
        this.addWindow(this._inputWindow);
    }
    inputWindowRect() {
        const wx = this._editWindow.x;
        const wy = this._editWindow.y + this._editWindow.height + 8;
        const ww = this._editWindow.width;
        const wh = this.calcWindowHeight(9, true);
        return new Rectangle(wx, wy, ww, wh);
    }
    onInputOk() {
        this._actor.setName(this._editWindow.name());
        this.popScene();
    }
}
//-----------------------------------------------------------------------------
// Scene_Debug
//
// The scene class of the debug screen.

class Scene_Debug extends Scene_MenuBase {
    create() {
        Scene_MenuBase.prototype.create.call(this);
        this.createRangeWindow();
        this.createEditWindow();
        this.createDebugHelpWindow();
    }
    needsCancelButton() {
        return false;
    }
    createRangeWindow() {
        const rect = this.rangeWindowRect();
        this._rangeWindow = new Window_DebugRange(rect);
        this._rangeWindow.setHandler("ok", this.onRangeOk.bind(this));
        this._rangeWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._rangeWindow);
    }
    rangeWindowRect() {
        const wx = 0;
        const wy = 0;
        const ww = 246;
        const wh = Graphics.boxHeight;
        return new Rectangle(wx, wy, ww, wh);
    }
    createEditWindow() {
        const rect = this.editWindowRect();
        this._editWindow = new Window_DebugEdit(rect);
        this._editWindow.setHandler("cancel", this.onEditCancel.bind(this));
        this._rangeWindow.setEditWindow(this._editWindow);
        this.addWindow(this._editWindow);
    }
    editWindowRect() {
        const wx = this._rangeWindow.width;
        const wy = 0;
        const ww = Graphics.boxWidth - wx;
        const wh = this.calcWindowHeight(10, true);
        return new Rectangle(wx, wy, ww, wh);
    }
    createDebugHelpWindow() {
        const rect = this.debugHelpWindowRect();
        this._debugHelpWindow = new Window_Base(rect);
        this.addWindow(this._debugHelpWindow);
    }
    debugHelpWindowRect() {
        const wx = this._editWindow.x;
        const wy = this._editWindow.height;
        const ww = this._editWindow.width;
        const wh = Graphics.boxHeight - wy;
        return new Rectangle(wx, wy, ww, wh);
    }
    onRangeOk() {
        this._editWindow.activate();
        this._editWindow.select(0);
        this.refreshHelpWindow();
    }
    onEditCancel() {
        this._rangeWindow.activate();
        this._editWindow.deselect();
        this.refreshHelpWindow();
    }
    refreshHelpWindow() {
        const helpWindow = this._debugHelpWindow;
        helpWindow.contents.clear();
        if (this._editWindow.active) {
            const rect = helpWindow.baseTextRect();
            helpWindow.drawTextEx(this.helpText(), rect.x, rect.y, rect.width);
        }
    }
    helpText() {
        if (this._rangeWindow.mode() === "switch") {
            return "Enter : ON / OFF";
        } else {
            return (
                "Left     :  -1    Pageup   : -10\n" +
                "Right    :  +1    Pagedown : +10"
            );
        }
    }
}
//-----------------------------------------------------------------------------
// Scene_Battle
//
// The scene class of the battle screen.

class Scene_Battle extends Scene_Message {
    create() {
        Scene_Message.prototype.create.call(this);
        this.createDisplayObjects();
    }
    start() {
        Scene_Message.prototype.start.call(this);
        BattleManager.playBattleBgm();
        BattleManager.startBattle();
        this._statusWindow.refresh();
        this.startFadeIn(this.fadeSpeed(), false);
    }
    update() {
        const active = this.isActive();
        $gameTimer.update(active);
        $gameScreen.update();
        this.updateVisibility();
        if (active && !this.isBusy()) {
            this.updateBattleProcess();
        }
        Scene_Message.prototype.update.call(this);
    }
    updateVisibility() {
        this.updateLogWindowVisibility();
        this.updateStatusWindowVisibility();
        this.updateInputWindowVisibility();
        this.updateCancelButton();
    }
    updateBattleProcess() {
        BattleManager.update(this.isTimeActive());
    }
    isTimeActive() {
        if (BattleManager.isActiveTpb()) {
            return !this._skillWindow.active && !this._itemWindow.active;
        } else {
            return !this.isAnyInputWindowActive();
        }
    }
    isAnyInputWindowActive() {
        return (
            this._partyCommandWindow.active ||
            this._actorCommandWindow.active ||
            this._skillWindow.active ||
            this._itemWindow.active ||
            this._actorWindow.active ||
            this._enemyWindow.active
        );
    }
    changeInputWindow() {
        this.hideSubInputWindows();
        if (BattleManager.isInputting()) {
            if (BattleManager.actor()) {
                this.startActorCommandSelection();
            } else {
                this.startPartyCommandSelection();
            }
        } else {
            this.endCommandSelection();
        }
    }
    stop() {
        Scene_Message.prototype.stop.call(this);
        if (this.needsSlowFadeOut()) {
            this.startFadeOut(this.slowFadeSpeed(), false);
        } else {
            this.startFadeOut(this.fadeSpeed(), false);
        }
        this._statusWindow.close();
        this._partyCommandWindow.close();
        this._actorCommandWindow.close();
    }
    terminate() {
        Scene_Message.prototype.terminate.call(this);
        $gameParty.onBattleEnd();
        $gameTroop.onBattleEnd();
        AudioManager.stopMe();
        if (this.shouldAutosave()) {
            this.requestAutosave();
        }
    }
    shouldAutosave() {
        return SceneManager.isNextScene(Scene_Map);
    }
    needsSlowFadeOut() {
        return (
            SceneManager.isNextScene(Scene_Title) ||
            SceneManager.isNextScene(Scene_Gameover)
        );
    }
    updateLogWindowVisibility() {
        this._logWindow.visible = !this._helpWindow.visible;
    }
    updateStatusWindowVisibility() {
        if ($gameMessage.isBusy()) {
            this._statusWindow.close();
        } else if (this.shouldOpenStatusWindow()) {
            this._statusWindow.open();
        }
        this.updateStatusWindowPosition();
    }
    shouldOpenStatusWindow() {
        return (
            this.isActive() &&
            !this.isMessageWindowClosing() &&
            !BattleManager.isBattleEnd()
        );
    }
    updateStatusWindowPosition() {
        const statusWindow = this._statusWindow;
        const targetX = this.statusWindowX();
        if (statusWindow.x < targetX) {
            statusWindow.x = Math.min(statusWindow.x + 16, targetX);
        }
        if (statusWindow.x > targetX) {
            statusWindow.x = Math.max(statusWindow.x - 16, targetX);
        }
    }
    statusWindowX() {
        if (this.isAnyInputWindowActive()) {
            return this.statusWindowRect().x;
        } else {
            return this._partyCommandWindow.width / 2;
        }
    }
    updateInputWindowVisibility() {
        if ($gameMessage.isBusy()) {
            this.closeCommandWindows();
            this.hideSubInputWindows();
        } else if (this.needsInputWindowChange()) {
            this.changeInputWindow();
        }
    }
    needsInputWindowChange() {
        const windowActive = this.isAnyInputWindowActive();
        const inputting = BattleManager.isInputting();
        if (windowActive && inputting) {
            return this._actorCommandWindow.actor() !== BattleManager.actor();
        }
        return windowActive !== inputting;
    }
    updateCancelButton() {
        if (this._cancelButton) {
            this._cancelButton.visible =
                this.isAnyInputWindowActive() && !this._partyCommandWindow.active;
        }
    }
    createDisplayObjects() {
        this.createSpriteset();
        this.createWindowLayer();
        this.createAllWindows();
        this.createButtons();
        BattleManager.setLogWindow(this._logWindow);
        BattleManager.setSpriteset(this._spriteset);
        this._logWindow.setSpriteset(this._spriteset);
    }
    createSpriteset() {
        this._spriteset = new Spriteset_Battle();
        this.addChild(this._spriteset);
    }
    createAllWindows() {
        this.createLogWindow();
        this.createStatusWindow();
        this.createPartyCommandWindow();
        this.createActorCommandWindow();
        this.createHelpWindow();
        this.createSkillWindow();
        this.createItemWindow();
        this.createActorWindow();
        this.createEnemyWindow();
        Scene_Message.prototype.createAllWindows.call(this);
    }
    createLogWindow() {
        const rect = this.logWindowRect();
        this._logWindow = new Window_BattleLog(rect);
        this.addWindow(this._logWindow);
    }
    logWindowRect() {
        const wx = 0;
        const wy = 0;
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(10, false);
        return new Rectangle(wx, wy, ww, wh);
    }
    createStatusWindow() {
        const rect = this.statusWindowRect();
        const statusWindow = new Window_BattleStatus(rect);
        this.addWindow(statusWindow);
        this._statusWindow = statusWindow;
    }
    statusWindowRect() {
        const extra = 10;
        const ww = Graphics.boxWidth - 192;
        const wh = this.windowAreaHeight() + extra;
        const wx = this.isRightInputMode() ? 0 : Graphics.boxWidth - ww;
        const wy = Graphics.boxHeight - wh + extra - 4;
        return new Rectangle(wx, wy, ww, wh);
    }
    createPartyCommandWindow() {
        const rect = this.partyCommandWindowRect();
        const commandWindow = new Window_PartyCommand(rect);
        commandWindow.setHandler("fight", this.commandFight.bind(this));
        commandWindow.setHandler("escape", this.commandEscape.bind(this));
        commandWindow.deselect();
        this.addWindow(commandWindow);
        this._partyCommandWindow = commandWindow;
    }
    partyCommandWindowRect() {
        const ww = 192;
        const wh = this.windowAreaHeight();
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = Graphics.boxHeight - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    createActorCommandWindow() {
        const rect = this.actorCommandWindowRect();
        const commandWindow = new Window_ActorCommand(rect);
        commandWindow.y = Graphics.boxHeight - commandWindow.height;
        commandWindow.setHandler("attack", this.commandAttack.bind(this));
        commandWindow.setHandler("skill", this.commandSkill.bind(this));
        commandWindow.setHandler("guard", this.commandGuard.bind(this));
        commandWindow.setHandler("item", this.commandItem.bind(this));
        commandWindow.setHandler("cancel", this.commandCancel.bind(this));
        this.addWindow(commandWindow);
        this._actorCommandWindow = commandWindow;
    }
    actorCommandWindowRect() {
        const ww = 192;
        const wh = this.windowAreaHeight();
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = Graphics.boxHeight - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    createHelpWindow() {
        const rect = this.helpWindowRect();
        this._helpWindow = new Window_Help(rect);
        this._helpWindow.hide();
        this.addWindow(this._helpWindow);
    }
    helpWindowRect() {
        const wx = 0;
        const wy = this.helpAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.helpAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    }
    createSkillWindow() {
        const rect = this.skillWindowRect();
        this._skillWindow = new Window_BattleSkill(rect);
        this._skillWindow.setHelpWindow(this._helpWindow);
        this._skillWindow.setHandler("ok", this.onSkillOk.bind(this));
        this._skillWindow.setHandler("cancel", this.onSkillCancel.bind(this));
        this.addWindow(this._skillWindow);
    }
    skillWindowRect() {
        const ww = Graphics.boxWidth;
        const wh = this.windowAreaHeight();
        const wx = 0;
        const wy = Graphics.boxHeight - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    createItemWindow() {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_BattleItem(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
    }
    itemWindowRect() {
        return this.skillWindowRect();
    }
    createActorWindow() {
        const rect = this.actorWindowRect();
        this._actorWindow = new Window_BattleActor(rect);
        this._actorWindow.setHandler("ok", this.onActorOk.bind(this));
        this._actorWindow.setHandler("cancel", this.onActorCancel.bind(this));
        this.addWindow(this._actorWindow);
    }
    actorWindowRect() {
        return this.statusWindowRect();
    }
    createEnemyWindow() {
        const rect = this.enemyWindowRect();
        this._enemyWindow = new Window_BattleEnemy(rect);
        this._enemyWindow.setHandler("ok", this.onEnemyOk.bind(this));
        this._enemyWindow.setHandler("cancel", this.onEnemyCancel.bind(this));
        this.addWindow(this._enemyWindow);
    }
    enemyWindowRect() {
        const wx = this._statusWindow.x;
        const ww = this._statusWindow.width;
        const wh = this.windowAreaHeight();
        const wy = Graphics.boxHeight - wh;
        return new Rectangle(wx, wy, ww, wh);
    }
    helpAreaTop() {
        return 0;
    }
    helpAreaBottom() {
        return this.helpAreaTop() + this.helpAreaHeight();
    }
    helpAreaHeight() {
        return this.calcWindowHeight(2, false);
    }
    buttonAreaTop() {
        return this.helpAreaBottom();
    }
    windowAreaHeight() {
        return this.calcWindowHeight(4, true);
    }
    createButtons() {
        if (ConfigManager.touchUI) {
            this.createCancelButton();
        }
    }
    createCancelButton() {
        this._cancelButton = new Sprite_Button("cancel");
        this._cancelButton.x = Graphics.boxWidth - this._cancelButton.width - 4;
        this._cancelButton.y = this.buttonY();
        this.addWindow(this._cancelButton);
    }
    closeCommandWindows() {
        this._partyCommandWindow.deactivate();
        this._actorCommandWindow.deactivate();
        this._partyCommandWindow.close();
        this._actorCommandWindow.close();
    }
    hideSubInputWindows() {
        this._actorWindow.deactivate();
        this._enemyWindow.deactivate();
        this._skillWindow.deactivate();
        this._itemWindow.deactivate();
        this._actorWindow.hide();
        this._enemyWindow.hide();
        this._skillWindow.hide();
        this._itemWindow.hide();
    }
    startPartyCommandSelection() {
        this._statusWindow.deselect();
        this._statusWindow.show();
        this._statusWindow.open();
        this._actorCommandWindow.setup(null);
        this._actorCommandWindow.close();
        this._partyCommandWindow.setup();
    }
    commandFight() {
        this.selectNextCommand();
    }
    commandEscape() {
        BattleManager.processEscape();
        this.changeInputWindow();
    }
    startActorCommandSelection() {
        this._statusWindow.show();
        this._statusWindow.selectActor(BattleManager.actor());
        this._partyCommandWindow.close();
        this._actorCommandWindow.show();
        this._actorCommandWindow.setup(BattleManager.actor());
    }
    commandAttack() {
        const action = BattleManager.inputtingAction();
        action.setAttack();
        this.onSelectAction();
    }
    commandSkill() {
        this._skillWindow.setActor(BattleManager.actor());
        this._skillWindow.setStypeId(this._actorCommandWindow.currentExt());
        this._skillWindow.refresh();
        this._skillWindow.show();
        this._skillWindow.activate();
        this._statusWindow.hide();
        this._actorCommandWindow.hide();
    }
    commandGuard() {
        const action = BattleManager.inputtingAction();
        action.setGuard();
        this.onSelectAction();
    }
    commandItem() {
        this._itemWindow.refresh();
        this._itemWindow.show();
        this._itemWindow.activate();
        this._statusWindow.hide();
        this._actorCommandWindow.hide();
    }
    commandCancel() {
        this.selectPreviousCommand();
    }
    selectNextCommand() {
        BattleManager.selectNextCommand();
        this.changeInputWindow();
    }
    selectPreviousCommand() {
        BattleManager.selectPreviousCommand();
        this.changeInputWindow();
    }
    startActorSelection() {
        this._actorWindow.refresh();
        this._actorWindow.show();
        this._actorWindow.activate();
    }
    onActorOk() {
        const action = BattleManager.inputtingAction();
        action.setTarget(this._actorWindow.index());
        this.hideSubInputWindows();
        this.selectNextCommand();
    }
    onActorCancel() {
        this._actorWindow.hide();
        switch (this._actorCommandWindow.currentSymbol()) {
            case "skill":
                this._skillWindow.show();
                this._skillWindow.activate();
                break;
            case "item":
                this._itemWindow.show();
                this._itemWindow.activate();
                break;
        }
    }
    startEnemySelection() {
        this._enemyWindow.refresh();
        this._enemyWindow.show();
        this._enemyWindow.select(0);
        this._enemyWindow.activate();
        this._statusWindow.hide();
    }
    onEnemyOk() {
        const action = BattleManager.inputtingAction();
        action.setTarget(this._enemyWindow.enemyIndex());
        this.hideSubInputWindows();
        this.selectNextCommand();
    }
    onEnemyCancel() {
        this._enemyWindow.hide();
        switch (this._actorCommandWindow.currentSymbol()) {
            case "attack":
                this._statusWindow.show();
                this._actorCommandWindow.activate();
                break;
            case "skill":
                this._skillWindow.show();
                this._skillWindow.activate();
                break;
            case "item":
                this._itemWindow.show();
                this._itemWindow.activate();
                break;
        }
    }
    onSkillOk() {
        const skill = this._skillWindow.item();
        const action = BattleManager.inputtingAction();
        action.setSkill(skill.id);
        BattleManager.actor().setLastBattleSkill(skill);
        this.onSelectAction();
    }
    onSkillCancel() {
        this._skillWindow.hide();
        this._statusWindow.show();
        this._actorCommandWindow.show();
        this._actorCommandWindow.activate();
    }
    onItemOk() {
        const item = this._itemWindow.item();
        const action = BattleManager.inputtingAction();
        action.setItem(item.id);
        $gameParty.setLastItem(item);
        this.onSelectAction();
    }
    onItemCancel() {
        this._itemWindow.hide();
        this._statusWindow.show();
        this._actorCommandWindow.show();
        this._actorCommandWindow.activate();
    }
    onSelectAction() {
        const action = BattleManager.inputtingAction();
        if (!action.needsSelection()) {
            this.selectNextCommand();
        } else if (action.isForOpponent()) {
            this.startEnemySelection();
        } else {
            this.startActorSelection();
        }
    }
    endCommandSelection() {
        this.closeCommandWindows();
        this.hideSubInputWindows();
        this._statusWindow.deselect();
        this._statusWindow.show();
    }
}
//-----------------------------------------------------------------------------
// Scene_Gameover
//
// The scene class of the game over screen.

class Scene_Gameover extends Scene_Base {
    create() {
        Scene_Base.prototype.create.call(this);
        this.playGameoverMusic();
        this.createBackground();
    }
    start() {
        Scene_Base.prototype.start.call(this);
        this.adjustBackground();
        this.startFadeIn(this.slowFadeSpeed(), false);
    }
    update() {
        if (this.isActive() && !this.isBusy() && this.isTriggered()) {
            this.gotoTitle();
        }
        Scene_Base.prototype.update.call(this);
    }
    stop() {
        Scene_Base.prototype.stop.call(this);
        this.fadeOutAll();
    }
    terminate() {
        Scene_Base.prototype.terminate.call(this);
        AudioManager.stopAll();
    }
    playGameoverMusic() {
        AudioManager.stopBgm();
        AudioManager.stopBgs();
        AudioManager.playMe($dataSystem.gameoverMe);
    }
    createBackground() {
        this._backSprite = new Sprite();
        this._backSprite.bitmap = ImageManager.loadSystem("GameOver");
        this.addChild(this._backSprite);
    }
    adjustBackground() {
        this.scaleSprite(this._backSprite);
        this.centerSprite(this._backSprite);
    }
    isTriggered() {
        return Input.isTriggered("ok") || TouchInput.isTriggered();
    }
    gotoTitle() {
        SceneManager.goto(Scene_Title);
    }
}
//-----------------------------------------------------------------------------
