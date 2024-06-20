/*:
 * @target MZ
 * @author Zaun
 * @plugindesc 性能优化插件 ver 2.12
 * @base Zaun_Core
 * @orderAfter Zaun_Core
 * @orderBefore Zaun_Spine
 * @help
 * 2024.5.5 PM 17:00
 * 初版完成 1.00
 * 该插件可以和spine一起用，但
 * 必须放在Zaun_Spine之前
 * 除此之外
 * 该插件需要和Zaun_Core一起使用，
 * 且置于后者下方
 *
 * 2024.5.6 PM 20:00
 * 版本变化 1.00 -> 1.01
 * 优化了游戏的刷新逻辑
 * 取消了PIXI.Application的使用
 * 移除项 Graphics.app
 * 增加项，现在可以直接访问Graphics._stage
 *
 * 2024.5.13 PM 19:30
 * 版本变化 1.00-> 1.10
 * 增加了对mv的优化调整
 * mv的加载设置太过混乱，并没有进行修改
 * 其他部分与mz版本同步
 *
 * 2024.6.3 PM 18:00
 * 版本变化 1.10-> 1.20
 * 性能优化若干
 * fps锁定
 * 多余话不再赘述
 * 
 * 2024.6.8 AM 10:00
 * 版本变化 1.20->2.00
 * 正式宣告 大幅度优化的第一阶段完成
 * 当前版本必须使用配套的pixi版本
 * pixi经过部分修改，
 * 和pixi官方下载的7.4.2版本已经有了一些不可逆转的改动
 * 这些改动加上这个插件提供的额外改动，来达成高效的渲染
 * 待改进:
 * 1.精灵和窗口以及其他容器未敢大幅度修改渲染逻辑
 * 只保证所偶顶层的场景经过优化
 * 2.PIXI.Graphics需要进行调整
 * 因为PIXI的纹理系统被我修改过，
 * 直接使用PIXI.Graphics会报错，错误原因在于默认情况下
 * Graphics的纹理不提供任何的uv坐标和原始坐标
 * 
 * 有其他bug请群内反馈
 * 
 * 2024.6.10 PM 15:00
 * 版本变化 2.00-> 2.10
 * 针对渲染循环的优化
 * 会比之前占用更少的循环耗时
 * 但需要注意的时，可能存在其他的update方法需要重写
 * 如果有异常，请在群内反馈
 * 
 * 窗口的cursorSprite现在只有一个普通的精灵
 * 不再有其他的child，因此进行的是缩放的改变
 * updatefilterArea已移除，由一个新的容器运行，不再由window控制
 * 以此来简化逻辑
 * 
 * 上版本遗留的纹理异常溢出问题已修复
 * 
 * 目前可能存在的一个问题是，行走图精灵发生blendmode改变时，
 * 会有几帧的时间无法渲染，画面表现为影像闪烁
 * 这个问题随后修复
 * 
 * 此外 需要对于滤镜添加(已有setFilter改为addFilter)
 * 可以写成 aaa.addFilter(filter);
 * 滤镜移除 aaa.removeFilter(filter);
 * 清空当前所有滤镜 aaa.clearFilters()
 * 滤镜不再需要手动处理数组和滤镜区域了
 * 滤镜不再依赖PIXI的 getBounds的计算方式来计算滤镜区域
 * 
 * 对于后续的改动
 * 移除精灵渲染的children
 * 精灵变更为不可添加child
 * 有且只允许container自身进行添加和管理
 * 以达到进一步减少循环次数的设置
 * 
 * 2024.6.10 PM 19:00
 * 版本变化 2.10->2.11
 * 对滤镜的渲染纹理进行了修改，考虑到滤镜的渲染是需要不断进行的
 * 且滤镜所需要的纹理数量是固定的
 * 所有不会对滤镜的纹理进行重置，之前版本中重置花费了大量时间
 * 并且，滤镜需要的纹理是包含记录滤镜的滤镜区域的
 * 理应与其他纹理进行分开
 * 剩余的rendertexture和baserendertexture均是动态的使用
 * 动态的重置 ，使用场景有地图的渲染，以及场景背景快照
 * 
 * 2024.6.10 PM 22:30
 * 版本变化 2.10->2.11
 * 粒子动画大幅度优化
 * 我只能优化js端的代码性能
 * 
 * 他额外的消耗在wasm端调用webgl
 * 这个我修改不了
 * 除非有他们的源码，修改后重新编译wasm文件
 * 
 *
 * @param maxFps
 * @text 锁定设备的最大fps
 * @type select
 * @option 30fps
 * @value 30
 * @option 60fps
 * @value 60
 * @option 90fps
 * @value 90
 * @option 120fps
 * @value 120
 * @default 60
 */
"use strict";
Zaun.Performance = ((Performance) => {
    PIXI.TextureSystem.prototype.bind = function (texture, location = 0) {
        const { gl } = this;
        texture = texture == null ? void 0 : texture.castToBaseTexture();
        if (texture != null && texture.valid && !texture.parentTextureArray) {
            const glTexture =
                texture._glTextures[this.CONTEXT_UID] || this.initTexture(texture);
            if (this.boundTextures[location] !== texture) {
                if (this.currentLocation !== location) {
                    this.currentLocation = location;
                    gl.activeTexture(gl.TEXTURE0 + location);
                }
                gl.bindTexture(texture.target, glTexture.texture);
            }
            if (glTexture.dirtyId !== texture.dirtyId) {
                if (this.currentLocation !== location) {
                    this.currentLocation = location;
                    gl.activeTexture(gl.TEXTURE0 + location);
                }
                this.updateTexture(texture);
            } else if (glTexture.dirtyStyleId !== texture.dirtyStyleId) {
                this.updateTextureStyle(texture);
            }
            this.boundTextures[location] = texture;
        } else {
            if (this.currentLocation !== location) {
                this.currentLocation = location;
                gl.activeTexture(gl.TEXTURE0 + location);
            }
            gl.bindTexture(gl.TEXTURE_2D, this.emptyTextures[gl.TEXTURE_2D].texture);
            this.boundTextures[location] = null;
        }
    };
    PIXI.TextureSystem.prototype.initTexture = function (texture) {
        const glTexture = BIGPOOL.get(PIXI.GLTexture);
        glTexture.initialize(this.gl.createTexture());
        texture._glTextures[this.CONTEXT_UID] = glTexture;
        this.managedTextures.push(texture);
        return glTexture;
    };
    PIXI.TextureSystem.prototype.destroyTexture = function (texture, skipRemove) {
        const { gl } = this;
        texture = texture.castToBaseTexture();
        const glTexture = texture._glTextures[this.CONTEXT_UID];
        if (glTexture) {
            this.unbind(texture);
            gl.deleteTexture(glTexture.texture);
            Reflect.deleteProperty(texture._glTextures, this.CONTEXT_UID);
            if (!skipRemove) {
                const index = this.managedTextures.indexOf(texture);
                if (index !== -1) {
                    this.managedTextures.splice(index, 1);
                }
            }
            BIGPOOL.return(glTexture);
        }
    };
    PIXI.TextureSystem.prototype.updateTexture = function (texture) {
        const glTexture = texture._glTextures[this.CONTEXT_UID];
        if (!glTexture) return;
        const renderer = this.renderer;
        const resource = texture.resource;
        if (resource !== null) {
            resource.upload(renderer, texture, glTexture);
        } else {
            const width = texture.width;
            const height = texture.height;
            const gl = renderer.gl;
            if (
                glTexture.width !== width ||
                glTexture.height !== height ||
                glTexture.dirtyId < 0
            ) {
                glTexture.width = width;
                glTexture.height = height;
                gl.texImage2D(
                    texture.target,
                    0,
                    glTexture.internalFormat,
                    width,
                    height,
                    0,
                    texture.format,
                    glTexture.type,
                    null
                );
            }
        }
        if (texture.dirtyStyleId !== glTexture.dirtyStyleId) {
            this.updateTextureStyle(texture);
        }
        glTexture.dirtyId = texture.dirtyId;
    };
    PIXI.Geometry.prototype.initialize = function (buffers = [], attributes = {}) {
        this.buffers = buffers;
        this.attributes = attributes;
    }
    PIXI.Geometry.prototype.checkBuffer = function (buffer) {
        if (!(buffer instanceof PIXI.Buffer)) {
            if (Array.isArray(buffer)) {
                const bufferArray = new Float32Array(buffer);
                buffer = BIGPOOL.get(PIXI.Buffer);
                buffer.initialize(bufferArray);
            } else {
                const bufferArray = buffer;
                buffer = BIGPOOL.get(PIXI.Buffer);
                buffer.initialize(bufferArray);
            }
        }
        return buffer;
    }
    PIXI.Geometry.prototype.addAttribute = function (id, buffer, size = 0, normalized = !1, type, stride, start, instance = !1) {
        if (!buffer) throw new Error("You must pass a buffer when creating an attribute");
        buffer = this.checkBuffer(buffer);
        const ids = id.split("|");
        if (ids.length > 1) {
            for (let i2 = 0; i2 < ids.length; i2++)
                this.addAttribute(ids[i2], buffer, size, normalized, type);
            return this;
        }
        let bufferIndex = this.buffers.indexOf(buffer);
        bufferIndex === -1 && (this.buffers.push(buffer), bufferIndex = this.buffers.length - 1);
        const attribute = BIGPOOL.get(PIXI.Attribute);
        attribute.initialize(bufferIndex, size, normalized, type, stride, start, instance)
        this.attributes[id] = attribute;
        this.instanced = this.instanced || instance;
        return this;
    }
    PIXI.Geometry.prototype.checkIndex = function (buffer) {
        if (!(buffer instanceof PIXI.Buffer)) {
            if (Array.isArray(buffer)) {
                const indexBuffer = new Uint16Array(buffer);
                buffer = BIGPOOL.get(PIXI.Buffer);
                buffer.initialize(indexBuffer);
            } else {
                const bufferArray = buffer;
                buffer = BIGPOOL.get(PIXI.Buffer);
                buffer.initialize(bufferArray);
            }
        }
        return buffer;
    }
    PIXI.Geometry.prototype.addIndex = function (buffer) {
        buffer = this.checkIndex(buffer);
        buffer.type = PIXI.BUFFER_TYPE.ELEMENT_ARRAY_BUFFER;
        this.indexBuffer = buffer;
        if (!this.buffers.includes(buffer)) {
            this.buffers.push(buffer);
        }
        return this;
    }
    PIXI.Geometry.prototype.interleave = function () {
        const buffers = this.buffers;
        const buffersLength = buffers.length;
        if (buffersLength === 1 || buffersLength === 2 && this.indexBuffer)
            return this;
        const arrays = [], sizes = [], interleavedBuffer = BIGPOOL.get(PIXI.Buffer);
        let i2;
        for (i2 in this.attributes) {
            const attribute = this.attributes[i2], buffer = this.buffers[attribute.buffer];
            arrays.push(buffer.data), sizes.push(attribute.size * byteSizeMap$1[attribute.type] / 4), attribute.buffer = 0;
        }
        interleavedBuffer.data = interleaveTypedArrays(arrays, sizes);
        const indexBuffer = this.indexBuffer;
        for (i2 = 0; i2 < buffersLength; i2++) {
            const buffer = buffers[i2];
            if (buffer !== indexBuffer) {
                BIGPOOL.return(buffer);
            }
        }
        buffers.length = 0;
        buffers.push(interleavedBuffer);
        indexBuffer && buffers.push(this.indexBuffer);
        return this;
    }
    PIXI.Geometry.prototype.dispose = function(){
        this.reset();
    }
    PIXI.Geometry.prototype.reset = function () {
        Graphics.renderer.geometry.disposeGeometry(this, false);
        this.refCount = 0;
        this.buffers = null;
        this.indexBuffer = null;
        for (const id in this.attributes) {
            BIGPOOL.return(this.attributes[id]);
            Reflect.deleteProperty(this.attributes, id);
        }
        this.attributes = null;
    }
    PIXI.BufferSystem.prototype.createGlBuffer = function (buffer) {
        const { CONTEXT_UID, gl } = this;
        const glBuffer = BIGPOOL.get(PIXI.GLBuffer);
        glBuffer.initialize(gl.createBuffer());
        buffer._glBuffers[CONTEXT_UID] = glBuffer;
        this.managedBuffers.add(buffer);
        buffer._glBuffers[CONTEXT_UID];
        return buffer;
    }
    PIXI.BufferSystem.prototype.dispose = function (buffer, contextLost) {
        if (!this.managedBuffers.has(buffer)) return;
        this.managedBuffers.delete(buffer);
        const CONTEXT_UID = this.CONTEXT_UID;
        const glBuffer = buffer._glBuffers[CONTEXT_UID];
        const gl = this.gl;
        if (glBuffer !== void 0) {
            if (!contextLost) gl.deleteBuffer(glBuffer.buffer);
            BIGPOOL.return(glBuffer);
            delete buffer._glBuffers[CONTEXT_UID];
        }
    }
    PIXI.BufferSystem.prototype.disposeAll = function (contextLost) {
        this.managedBuffers.forEach(buffer => {
            this.dispose(buffer, contextLost);
        })
        this.managedBuffers.clear();
    }
    PIXI.GeometrySystem.prototype.bind = function (geometry, shader) {
        shader = shader || this.renderer.shader.shader;
        const { gl } = this;
        const CONTEXT_UID = this.CONTEXT_UID;
        let vaos = geometry.glVertexArrayObjects[CONTEXT_UID];
        let incRefCount = false;
        if (vaos === void 0) {
            this.managedGeometries.add(geometry);
            geometry.glVertexArrayObjects[CONTEXT_UID] = vaos = {};
            incRefCount = true;
        }
        const vao = vaos[shader.program.id] || this.initGeometryVao(geometry, shader, incRefCount);
        this._activeGeometry = geometry;
        if (this._activeVao !== vao) {
            this._activeVao = vao;
            if (this.hasVao) {
                gl.bindVertexArray(vao);
            } else {
                this.activateVao(geometry, shader.program)
            }
        }
        this.updateBuffers();
    }
    PIXI.GeometrySystem.prototype.disposeGeometry = function (geometry, contextLost) {
        const renderer = this.renderer;
        if (!this.managedGeometries.has(geometry)) return;
        this.managedGeometries.delete(geometry);
        const vaos = geometry.glVertexArrayObjects[this.CONTEXT_UID];
        const gl = this.gl;
        const buffers = geometry.buffers;
        const bufferSystem = renderer.buffer;
        const CONTEXT_UID = this.CONTEXT_UID;
        if (vaos !== void 0) {
            if (bufferSystem)
                for (let i2 = 0; i2 < buffers.length; i2++) {
                    const buffer = buffers[i2];
                    const buf = buffer._glBuffers[CONTEXT_UID];
                    buf && (buf.refCount--, buf.refCount === 0 && !contextLost && bufferSystem.dispose(buffer, contextLost));
                    BIGPOOL.return(buffer);
                }
            buffers.length = 0;
            if (!contextLost) {
                for (const vaoId in vaos)
                    if (vaoId[0] === "g") {
                        const vao = vaos[vaoId];
                        this._activeVao === vao && this.unbind(), gl.deleteVertexArray(vao);
                    }
            }
            delete geometry.glVertexArrayObjects[CONTEXT_UID];
        }
    }
    PIXI.GeometrySystem.prototype.disposeAll = function (contextLost) {
        this.managedGeometries.forEach(geometry => this.disposeGeometry(geometry, contextLost));
        this.managedGeometries.clear();
    }
    PIXI.Attribute.prototype.initialize = function (buffer, size = 0, normalized = false, type = PIXI.TYPES.FLOAT, stride, start, instance, divisor = 1) {
        this.buffer = buffer;
        this.size = size;
        this.normalized = normalized;
        this.type = type;
        this.stride = stride;
        this.start = start;
        this.instance = instance;
        this.divisor = divisor;
    }
    PIXI.Attribute.prototype.reset = function () {
        this.buffer = null;
        this.size = 0;
        this.normalized = false;
        this.type = PIXI.TYPES.FLOAT;
        this.stride = null;
        this.start = null;
        this.instance = null;
        this.divisor = null;
    }
    PIXI.GLBuffer.prototype.initialize = function (buffer) {
        this.buffer = buffer;
    }
    PIXI.GLBuffer.prototype.reset = function () {
        this._updateID = -1;
        this.byteLength = -1;
        this.refCount = 0;
    }
    PIXI.Buffer.prototype.initialize = function (data, _static = true, index = false) {
        this.data = data || new Float32Array(1);
        this.index = index;
        this.static = _static;
        if (Graphics.renderer) Graphics.renderer.buffer.createGlBuffer(this);
    }
    PIXI.Buffer.prototype.reset = function () {
        this._updateID = 0;
        Graphics.renderer.buffer.dispose(this, false);
    }
    PIXI.Texture.WHITE.valid = true;
    PIXI.Texture.WHITE.frame = new Rectangle(0, 0, 16, 16);
    PIXI.Texture.EMPTY.isTexture = false;
    class ImageResource extends PIXI.Resource {
        constructor(source) {
            super(100, 100);
            this.source = null;
            if (source !== void 0) this.initialize(source);
        }
        initialize(source) {
            this.source = source;
            this._width = source.width;
            this._height = source.height;
        }
        resize(width, height) {
            this._width = width;
            this._height = height;
            this.source.width = width;
            this.source.height = height;
        }
        upload(renderer, baseTexture, glTexture) {
            const gl = renderer.gl;
            const source = this.source;
            const width = baseTexture.width;
            const height = baseTexture.height;
            gl.pixelStorei(
                gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
                baseTexture.alphaMode === PIXI.ALPHA_MODES.UNPACK
            );
            if (glTexture.width !== width || glTexture.height !== height) {
                gl.texImage2D(
                    baseTexture.target,
                    0,
                    glTexture.internalFormat,
                    baseTexture.format,
                    glTexture.type,
                    source
                );
                glTexture.width = width;
                glTexture.height = height;
            } else {
                gl.texSubImage2D(
                    gl.TEXTURE_2D,
                    0,
                    0,
                    0,
                    baseTexture.format,
                    glTexture.type,
                    source
                );
            }
        }
        reset() {
            if (this.source !== null) {
                this.source.close && this.source.close();
                this.source = null;
            }
        }
    }

    function getBufferType(array) {
        if (array.BYTES_PER_ELEMENT === 4)
            return array instanceof Float32Array ? "Float32Array" : array instanceof Uint32Array ? "Uint32Array" : "Int32Array";
        if (array.BYTES_PER_ELEMENT === 2) {
            if (array instanceof Uint16Array)
                return "Uint16Array";
        } else if (array.BYTES_PER_ELEMENT === 1 && array instanceof Uint8Array)
            return "Uint8Array";
        return null;
    }
    function interleaveTypedArrays(arrays, sizes) {
        let outSize = 0, stride = 0;
        const views = {};
        for (let i2 = 0; i2 < arrays.length; i2++)
            stride += sizes[i2], outSize += arrays[i2].length;
        const buffer = new ArrayBuffer(outSize * 4);
        let out = null, littleOffset = 0;
        for (let i2 = 0; i2 < arrays.length; i2++) {
            const size = sizes[i2], array = arrays[i2], type = getBufferType(array);
            views[type] || (views[type] = new map$1[type](buffer)), out = views[type];
            for (let j2 = 0; j2 < array.length; j2++) {
                const indexStart = (j2 / size | 0) * stride + littleOffset, index2 = j2 % size;
                out[indexStart + index2] = array[j2];
            }
            littleOffset += size;
        }
        return new Float32Array(buffer);
    }
    PIXI.BaseTexture.prototype.initialize = function (resource) {
        this.resource = resource;
        this.resolution = 1;
        this.width = resource.width;
        this.height = resource.height;
        this.valid = true;
    }
    PIXI.BaseTexture.prototype.update = function () {
        this.dirtyId++;
    }
    PIXI.BaseTexture.prototype.resize = function (width, height) {
        this.width = width;
        this.height = height;
        this.resource.resize(width, height);
        this.update();
    }
    PIXI.BaseTexture.prototype.reset = function () {
        Graphics.renderer.texture.destroyTexture(this, false);
        BIGPOOL.return(this.resource);
        this.resource = null;
        this.dirtyId = 0;
        this.dirtyStyleId = 0;
        this.uid++;
        this.valid = false;
        this._batchEnabled = 0;
        this._batchLocation = 0;
        this.parentTextureArray = null
    }
    PIXI.BaseTexture.prototype.dispose = function () {
        Graphics.renderer.texture.destroyTexture(this, false);
    }
    PIXI.Texture.prototype.initialize = function (baseTexture) {
        this.isTexture = true;
        this.baseTexture = baseTexture;
        const { width, height } = baseTexture;
        if (this._frame === void 0) {
            this._frame = BIGPOOL.get(Rectangle);
            this.orig = this._frame;
        }
        const frame = this._frame;
        frame.initialize(0, 0, width, height);
        this.noFrame = false;
        this.valid = true;
        this.initUvs();
        this.updateUvs();
    }
    PIXI.Texture.prototype.initUvs = function () {
        const uvs = BIGPOOL.get(PIXI.TextureUvs);
        uvs.initialize();
        this._uvs = uvs;
    }
    PIXI.Texture.prototype.setFrame = function (x, y, width, height) {
        const frame = this._frame;
        frame.x = x;
        frame.y = y;
        frame.width = width;
        frame.height = height;
        this.updateUvs();
    }
    PIXI.Texture.prototype.update = function () {
        console.warn("Deprecated! Texture.update has been removed");
    }
    PIXI.Texture.prototype.updateUvs = function () {
        this._uvs.set(this._frame, this.baseTexture, this._rotate);
        this._updateID++;
    }
    PIXI.Texture.prototype.reset = function () {
        this.valid = false;
        this.isTexture = false;
        BIGPOOL.return(this._uvs);
        this._uvs = null;
        BIGPOOL.return(this._frame);
        if (this._frame !== this.orig) {
            BIGPOOL.return(this._frame);
            BIGPOOL.return(this.orig);
        }
        this._frame = this.orig = void 0;
        if (this.trim) {
            BIGPOOL.return(this.trim);
            this.trim = void 0;
        }
        this._updateID = 0;
        this.noFrame = true;
        this.valid = false;
        this.baseTexture = null;
    }
    PIXI.TextureUvs.prototype.initialize = function () {
        if (this.uvsFloat32 === void 0) this.uvsFloat32 = new Float32Array();
    };
    PIXI.TextureUvs.prototype.reset = function () {
        const uvsFloat32 = this.uvsFloat32;
        uvsFloat32[0] = 0;
        uvsFloat32[1] = 0;
        uvsFloat32[2] = 1;
        uvsFloat32[3] = 0;
        uvsFloat32[4] = 1;
        uvsFloat32[5] = 1;
        uvsFloat32[6] = 0;
        uvsFloat32[7] = 1;
    };
    PIXI.Framebuffer.prototype.initialize = function (index, texture) {
        this.addColorTexture(index, texture);
    }
    PIXI.Framebuffer.prototype.resize = function (width, height) {
        if (this.width !== width || this.height || height) {
            this.width = width;
            this.height = height;
            this.dirtyId++;
            this.dirtySize++;
            const colorTextures = this.colorTextures;
            for (let i2 = 0; i2 < colorTextures.length; i2++) {
                const texture = colorTextures[i2];
                const resolution = texture.resolution || 1;
                const nw = width / resolution;
                const nh = height / resolution;
                texture.width = nw;
                texture.height = nh;
                texture.dirtyStyleId++;
                texture.dirtyId++;
            }
            const depthTexture = this.depthTexture;
            if (depthTexture !== null) {
                const resolution = depthTexture.resolution;
                depthTexture.width = width / resolution;
                depthTexture.height = height / resolution;
                depthTexture.dirtyStyleId++;
                depthTexture.dirtyId++;
            }
        }
    }
    PIXI.Framebuffer.prototype.reset = function () {
        this.disposeRunner.emit(this, false);
        this.disposeRunner.removeAll();
        const renderer = Graphics.renderer;
        const textureSystem = renderer.texture;
        this.colorTextures.forEach((baseTexture) =>
            textureSystem.destroyTexture(baseTexture)
        );
        this.colorTextures.length = 0;
        this.glFramebuffers = {};
        this.stencil = false;
        this.depth = false;
        this.dirtyId = 0;
        this.dirtyFormat = 0;
        this.dirtySize = 0;
    }
    PIXI.GLTexture.prototype.initialize = function (texture) {
        this.texture = texture;
    }
    PIXI.GLTexture.prototype.reset = function () {
        this.width = -1;
        this.height = -1;
        this.dirtyId = -1;
        this.dirtyStyleId = -1;
        this.mipmap = false;
        this.wrapMode = 33071;
        this.type = PIXI.TYPES.UNSIGNED_BYTE;
        this.internalFormat = PIXI.FORMATS.RGBA;
        this.samplerType = 0;
    }
    PIXI.BaseRenderTexture.prototype.initialize = function (width, height) {
        this.framebuffer = BIGPOOL.get(PIXI.Framebuffer);
        this.framebuffer.initialize(0, this);
        width = Math.max(Graphics._width, width);
        height = Math.max(Graphics._height, height);
        this.valid = true;
        this.resize(width, height);
    }
    PIXI.BaseRenderTexture.prototype.resize = function (width, height) {
        this.framebuffer.resize(width, height);
    }
    PIXI.BaseRenderTexture.prototype.reset = function () {
        BIGPOOL.return(this.framebuffer);
        this.framebuffer = null;
        this.width = 0;
        this.height = 0;
        this.dirtyId = 0;
        this.dirtyStyleId = 0;
        this.valid = false;
    }
    PIXI.RenderTexture.prototype.initialize = function (baseRenderTexture) {
        this.baseTexture = baseRenderTexture;
        const { width, height } = baseRenderTexture;
        if (this._frame === void 0) {
            this._frame = BIGPOOL.get(Rectangle);
            this.orig = this._frame;
        }
        const frame = this._frame;
        frame.initialize(0, 0, width, height);
        this.noFrame = true;
        this.valid = true;
        this.initUvs();
        this.updateUvs();
    }
    PIXI.RenderTexture.prototype.resize = function (width, height, resolution) {
        const frame = this.frame;
        frame.width = width;
        frame.height = height;
        this.baseTexture.resolution = resolution;
        this.baseTexture.resize(width, height);
        this.updateUvs();
    }
    PIXI.RenderTexture.prototype.initUvs = function () {
        const uvs = BIGPOOL.get(PIXI.TextureUvs);
        uvs.initialize();
        this._uvs = uvs;
    }
    PIXI.RenderTexture.prototype.updateUvs = function () {
        this._uvs.set(this._frame, this.baseTexture, this._rotate);
        this._updateID++;
    }
    PIXI.RenderTexture.prototype.reset = function () {
        BIGPOOL.return(this._uvs);
        this._uvs = null;
        BIGPOOL.return(this._frame);
        this._frame = this.orig = void 0;
        this._updateID = 0;
        this.noFrame = false;
        this.valid = false;
        RENDERTEXTURE_POOL.returnBaseRenderTexture(this.baseTexture);
        this.baseTexture = null;
    }
    class Pool {
        constructor(classConstructor) {
            this.cache = [];
            this.classConstructor = classConstructor;
        }
        get() {
            if (this.cache.length > 0) return this.cache.pop();
            return new this.classConstructor();
        }
        return(target) {
            target.reset();
            this.cache.push(target);
        }
    }
    class MultiplyPool {
        constructor() {
            this.poolCache = Object.create(null);
        }
        registerPool(classConstructor) {
            const name = classConstructor.name;
            let pool = Reflect.get(this.poolCache, name);
            if (pool !== void 0) return pool;
            pool = new Pool(classConstructor);
            this.poolCache[name] = pool;
            return pool;
        }
        get(classConstructor) {
            return this.registerPool(classConstructor).get();
        }
        return(classObject) {
            const classConstructor = classObject.constructor;
            const pool = this.registerPool(classConstructor);
            pool.return(classObject);
        }
    }
    class CanvasPool {
        constructor() {
            this.pool = [];
        }
        return({ canvas, context }) {
            context.reset();
            this.pool.push({ canvas, context });
        }
        get(width, height) {
            if (this.pool.length > 0) {
                const canvasObj = this.pool.pop();
                canvasObj.canvas.width = width;
                canvasObj.canvas.height = height;
                return canvasObj;
            }
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = width;
            canvas.height = height;
            return { canvas, context };
        }
    }
    class RenderTexturePool {
        constructor() {
            this.renderTexturePool = [];
            this.baseRenderTexturePool = [];
        }
        getBaseRenderTexture(width, height, resolution = 1) {
            const baseRenderTexture = this.baseRenderTexturePool.pop() || new PIXI.BaseRenderTexture();
            baseRenderTexture.initialize(width, height);
            baseRenderTexture.resolution = resolution;
            return baseRenderTexture;
        }
        returnBaseRenderTexture(baseRenderTexture) {
            baseRenderTexture.reset();
            this.baseRenderTexturePool.push(baseRenderTexture);
        }
        getRenderTexture(width, height, resolution) {
            const baseRenderTexture = this.getBaseRenderTexture(width, height, resolution);
            const renderTexture = this.renderTexturePool.pop() || new PIXI.RenderTexture();
            renderTexture.initialize(baseRenderTexture);
            return renderTexture;
        }
        returnRenderTexture(renderTexture) {
            renderTexture.reset();
            this.renderTexturePool.push(renderTexture);
        }
    }
    class FilterTexturePool {
        constructor() {
            this.renderTexturePool = [];
        }
        getBaseRenderTexture(width, height, resolution = 1) {
            const baseRenderTexture = new PIXI.BaseRenderTexture();
            baseRenderTexture.initialize(width, height);
            baseRenderTexture.resolution = resolution;
            return baseRenderTexture;
        }
        getRenderTexture(width, height, resolution) {
            width = Math.max(width, 100);
            height = Math.max(height, 100);
            if (this.renderTexturePool.length > 0) {
                const renderTexture = this.renderTexturePool.pop();
                renderTexture.baseTexture.resolution = resolution;
                renderTexture.resize(width, height, true);
                return renderTexture;
            } else {
                const baseRenderTexture = this.getBaseRenderTexture(width, height, resolution);
                const renderTexture = new PIXI.RenderTexture();
                renderTexture.initialize(baseRenderTexture);
                return renderTexture;
            }
        }
        returnRenderTexture(renderTexture) {
            this.renderTexturePool.push(renderTexture);
        }
    }
    const BIGPOOL = new MultiplyPool();
    const CANVASPOOL = new CanvasPool();
    const RENDERTEXTURE_POOL = new RenderTexturePool();
    const FILTER_TEXTUREPOOL = new FilterTexturePool();
    const { ParseSystem } = Zaun.Core;
    const pluginName = "Zaun_Performance";
    const origParameters = PluginManager.parameters(pluginName);
    const parameters = ParseSystem.toParse(origParameters);
    const { maxFps } = parameters;

    PIXI.FilterSystem.prototype.getOptimalFilterTexture = function (
        minWidth,
        minHeight,
        resolution = 1
    ) {
        return FILTER_TEXTUREPOOL.getRenderTexture(minWidth, minHeight, resolution);
    };
    PIXI.FilterSystem.prototype.returnFilterTexture = function (renderTexture) {
        FILTER_TEXTUREPOOL.returnRenderTexture(renderTexture);
    };
    PIXI.FilterSystem.prototype.getFilterTexture = function (input, resolution) {
        if (typeof input == "number") {
            const swap = input;
            (input = resolution), (resolution = swap);
        }
        input = input || this.activeState.renderTexture;
        const filterTexture = FILTER_TEXTUREPOOL.getRenderTexture(input.width,
            input.height,
            resolution || input.resolution)
        return (filterTexture.filterFrame = input.filterFrame), filterTexture;
    };
    PIXI.Matrix.prototype.reset = function () {
        this.array = null;
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;
    }
    PIXI.TextureMatrix.prototype.reset = function () {
        this._texture = null;
        this.mapCoord.reset();
        this.uClampFrame.fill(0);
        this.uClampOffset.fill(0);
        this._textureID = -1;
        this._updateID = 0;
        this.clampOffset = 0;
        this.clampMargin = 0.5;
        this.isSimple = false;
    }
    PIXI.Transform.prototype.reset = function () {
        const { position, scale, skew, pivot } = this;
        position._x = 0;
        position._y = 0;
        scale._x = 1;
        scale._y = 1;
        pivot._x = 0;
        pivot._y = 0;
        skew._x = 0;
        skew._y = 0;
        this._rotation = 0;
        this._cx = 1;
        this._sx = 0;
        this._cy = 0;
        this._sy = 1;
        this._localID = 0;
        this._currentLocalID = 0;
        this._worldID = 0;
        this._parentID = 0;
        this.worldTransform.reset();
        this.localTransform.reset();
    }
    PIXI.Transform.prototype.updateTransform = function (parentTransform) {
        this.updateLocalTransform();
        this.updateWorldTransform(parentTransform);
    };
    PIXI.Transform.prototype.updateWorldTransform = function (parentTransform) {
        if (this._parentID !== parentTransform._worldID) {
            const pt = parentTransform.worldTransform;
            const wt = this.worldTransform;
            const lt = this.localTransform;
            wt.a = lt.a * pt.a + lt.b * pt.c;
            wt.b = lt.a * pt.b + lt.b * pt.d;
            wt.c = lt.c * pt.a + lt.d * pt.c;
            wt.d = lt.c * pt.b + lt.d * pt.d;
            wt.tx = lt.tx * pt.a + lt.ty * pt.c + pt.tx;
            wt.ty = lt.tx * pt.b + lt.ty * pt.d + pt.ty;
            this._parentID = parentTransform._worldID;
            this._worldID++;
        }
    };
    PIXI.Transform.prototype.updateLocalTransform = function () {
        if (this._localID !== this._currentLocalID) {
            const scale = this.scale;
            const position = this.position;
            const pivot = this.pivot;
            const lt = this.localTransform;
            const px = pivot._x;
            const py = pivot._y;
            const sx = scale._x;
            const sy = scale._y;
            lt.a = this._cx * sx;
            lt.b = this._sx * sx;
            lt.c = this._cy * sy;
            lt.d = this._sy * sy;
            lt.tx = position._x - (px * lt.a + py * lt.c);
            lt.ty = position._y - (px * lt.b + py * lt.d);
            this._currentLocalID = this._localID;
            this._parentID = -1;
        }
    };
    PIXI.ObjectRendererSystem.prototype.renderScene = function (scene) {
        const renderer = this.renderer;
        this.renderingToScreen = true;
        renderer.emit("prerender");
        renderer.projection.transform = null;
        const { batch, renderTexture } = renderer;
        this.lastObjectRendered = scene;
        renderTexture.bind(void 0);
        batch.currentRenderer.start();
        renderTexture.clear();
        scene.render(renderer);
        batch.currentRenderer.flush();
        renderer.gl.flush();
        renderer.projection.transform = null;
    };

    const BatchRenderer = PIXI.BatchRenderer;
    BatchRenderer.prototype.start = function () {
        const renderer = this.renderer;
        renderer.state.set(this.state);
        renderer.shader.bind(this._shader);
        BatchRenderer.canUploadSameBuffer &&
            renderer.geometry.bind(this._packedGeometries[this._flushId]);
    };
    Math.randomInt = function (max) {
        return (max * Math.random()) >> 0;
    };
    PIXI.Rectangle.prototype.initialize = function (x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    PIXI.Rectangle.prototype.reset = function () {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }
    PIXI.Point.prototype.initialize = function (x, y) {
        this.x = x;
        this.y = y;
    }
    PIXI.Point.prototype.reset = function () {
        this.x = 0;
        this.y = 0;
    }
    PIXI.Filter.prototype.reset = function () {
        Graphics.renderer.shader.disposeShader(this);
    }
    PIXI.AlphaFilter.prototype.initialize = function () {
        this.alpha = 1;
    }
    PIXI.BlurFilter.prototype.initialize = function (quality = 4) {
        this.quality = quality;
    }
    ScreenSprite.prototype.initialize = function () {
        const { width, height } = Graphics;
        const { canvas, context } = CANVASPOOL.get(width, height);
        const imageSource = BIGPOOL.get(PIXI.ImageResource);
        imageSource.initialize(canvas);
        const baseTexture = BIGPOOL.get(PIXI.BaseTexture);
        baseTexture.initialize(imageSource);
        const texture = BIGPOOL.get(PIXI.Texture);
        texture.initialize(baseTexture);
        this.baseTexture = baseTexture;
        this.texture = texture;
        this.context = context;
        this.canvas = canvas;
        this.opacity = 0;
        this._red = -1;
        this._green = -1;
        this._blue = -1;
        this.setBlack();
    }
    ScreenSprite.prototype.setColor = function (r, g, b) {
        if (this._red !== r || this._green !== g || this._blue !== b) {
            r = Math.round(r || 0).clamp(0, 255);
            g = Math.round(g || 0).clamp(0, 255);
            b = Math.round(b || 0).clamp(0, 255);
            this._red = r;
            this._green = g;
            this._blue = b;
            const { width, height } = Graphics;
            const { context, baseTexture } = this;
            context.clearRect(0, 0, width, height);
            context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
            context.fillRect(0, 0, width, height);
            baseTexture.update();
        }
    }
    ScreenSprite.prototype.destroy = function () {
        BIGPOOL.return(this._texture);
        BIGPOOL.return(this.baseTexture);
        CANVASPOOL.return({ canvas: this.canvas, context: this.context });
        this.canvas = null;
        this.context = null;
        this.baseTexture = null;
        PIXI.Sprite.prototype.destroy.call(this, { children: true });
    }
    Weather.prototype.initialize = function () {
        this._width = Graphics._width;
        this._height = Graphics._height;
        this._createBitmaps();
        this.type = "none";
        this.power = 0;
        this.origin = BIGPOOL.get(Point);
    }
    Weather.prototype.destroy = function (options) {
        BIGPOOL.return(this.origin);
        BIGPOOL.return(this._rainBitmap);
        BIGPOOL.return(this._snowBitmap);
        BIGPOOL.return(this._stormBitmap);
        this.origin = null;
        this._rainBitmap = null;
        this._snowBitmap = null;
        this._stormBitmap = null;
        PIXI.Container.prototype.destroy.call(this, options);
    }
    Weather.prototype._createBitmaps = function () {
        const rain = this._rainBitmap = new Bitmap(1, 60);
        rain.fillAll("white");
        const storm = this._stormBitmap = new Bitmap(2, 100);
        storm.fillAll("white");
        const snow = this._snowBitmap = new Bitmap(9, 9);
        snow.drawCircle(4, 4, 4, "white");
    }
    Weather.prototype._updateAllSprites = function () {
        const maxSprites = (this.power * 10) >> 0;
        if (this.children.length < maxSprites) {
            this._addSprite();
        }
        if (this.children.length > maxSprites) {
            this._removeSprite();
        }
    }
    Weather.prototype._removeSprite = function () {
        const sprite = this.removeChild(this.children[this.children.length - 1]);
        sprite._bitmap = null;
        sprite.destroy();
    }
    Weather.rainAngle = Math.PI / 16;
    Weather.snowAngle = Math.PI / 16;
    Weather.stormAngle = Math.PI / 8;
    Weather.prototype._addSprite = function () {
        let sprite = null;
        switch (this.type) {
            case "rain": {
                sprite = new Sprite(this._rainBitmap);
                sprite.rotation = Weather.rainAngle;
            }
            case "snow": {
                sprite = new Sprite(this._snowBitmap);
                sprite.rotation = Weather.snowAngle;
            }
            case "storm": {
                sprite = new Sprite(this._snowBitmap);
                sprite.rotation = Weather.stormAngle;
            }
        }
        sprite.opacity = 0;
        this.addChild(sprite);
    }
    Weather.prototype.render = function (renderer) {
        const children = this.children;
        const origin = this.origin;
        const ox = origin.x;
        const oy = origin.y;
        for (let i2 = 0, j2 = children.length; i2 < j2; ++i2) {
            const child = children[i2];
            if (child === void 0) continue;
            child.render(renderer);
            this._updateSprite(child);
            child.position.set(child.ax - ox, child.ay - oy);
        }
    }
    Weather.prototype._updateRainSprite = function (sprite) {
        sprite.ax -= 6 * Math.sin(sprite.rotation);
        sprite.ay += 6 * Math.cos(sprite.rotation);
        sprite.opacity -= 6;
    }
    Weather.prototype._updateStormSprite = function (sprite) {
        sprite.ax -= 8 * Math.sin(sprite.rotation);
        sprite.ay += 8 * Math.cos(sprite.rotation);
        sprite.opacity -= 8;
    }
    Weather.prototype._updateSnowSprite = function (sprite) {
        sprite.ax -= 3 * Math.sin(sprite.rotation);
        sprite.ay += 3 * Math.cos(sprite.rotation);
        sprite.opacity -= 3;
    }
    Weather.prototype._rebornSprite = function (sprite) {
        const origin = this.origin;
        sprite.ax = Math.randomInt(Graphics._width + 100) - 100 + origin.x;
        sprite.ay = Math.randomInt(Graphics._height + 200) - 200 + origin.y;
        sprite.opacity = 160 + Math.randomInt(60);
    }
    Scene_Base.prototype.initialize = function () {
        this.updateFilter = Function.empty;
        if (this.filters === null) {
            this.filters = [];
        }
        this._started = false;
        this._active = false;
        this._fadeSign = 0;
        this._fadeDuration = 0;
        this._fadeWhite = 0;
        this._fadeOpacity = 0;
        this.createColorFilter();
    };
    Scene_Base.prototype.render = function (renderer) {
        const children = this.children;
        for (let i2 = 0, j2 = children.length; i2 < j2; ++i2) {
            const child = children[i2];
            if (child === void 0) continue;
            if (!child.isMask) child.render(renderer);
            child.update();
        }
    };
    Scene_Base.prototype._normalRender = function (renderer) {
        const children = this.children;
        for (let i2 = 0, j2 = children.length; i2 < j2; ++i2) {
            const child = children[i2];
            if (child === void 0) continue;
            if (!child.isMask) child.render(renderer);
            child.update();
        }
    };
    Scene_Base.prototype._filterRender = function (renderer) {
        const batch = renderer.batch;
        const filter = renderer.filter;
        batch.flush();
        filter.push(this, this.filters);
        const children = this.children;
        for (let i = 0, length = children.length; i < length; i++) {
            const child = children[i];
            if (child === void 0) continue;
            if (!child.isMask) child.render(renderer);
            child.update();
        }
        batch.flush();
        filter.pop();
    };
    Scene_Base.prototype.addFilter = function (filter) {
        if (filter !== null && !this.filters.includes(filter)) {
            this.filters.push(filter);
            this.render = this._filterRender;
        }
    };
    Scene_Base.prototype.removeFilter = function (filter) {
        if (filter !== null) {
            const index = this.filters.indexOf(filter);
            if (index !== -1) {
                this.filters.splice(index, 1);
            }
        }
        if (this.filters.length === 0) {
            this.render = this._normalRender;
        }
    };
    Scene_Base.prototype.clearFilters = function () {
        this.filters.length = 0;
        if (this.filterArea !== null) BIGPOOL.return(this.filterArea);
        this.filterArea = null;
        this.render = this._normalRender;
        this.updateFilter = Function.empty;
    };
    Scene_Base.prototype.destroy = function (options) {
        this.clearFilters();
        this._colorFilter = null;
        PIXI.Container.prototype.destroy.call(this, options);
    };
    Scene_Base.prototype.update = function () {
        this.updateFilter();
    };
    Scene_Base.prototype.startFadeIn = function (duration, white) {
        this._fadeSign = 1;
        this._fadeDuration = duration || 30;
        this._fadeWhite = white;
        this._fadeOpacity = 255;
        this.addFilter(this._colorFilter);
        this.updateColorFilter();
        this.updateFilter = this.updateFade;
    };
    Scene_Base.prototype.startFadeOut = function (duration, white) {
        this._fadeSign = -1;
        this._fadeDuration = duration || 30;
        this._fadeWhite = white;
        this._fadeOpacity = 0;
        this.addFilter(this._colorFilter);
        this.updateColorFilter();
        this.updateFilter = this.updateFade;
    };
    Scene_Base.prototype.createColorFilter = function () {
        const colorFilter = BIGPOOL.get(ColorFilter);
        this._colorFilter = colorFilter;
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(0, 0, Graphics._width, Graphics._height);
        this.filterArea = rect;
    };
    Scene_Base.prototype.updateColorFilter = function () {
        const c = this._fadeWhite ? 255 : 0;
        this._colorFilter.setBlendColor([c, c, c, this._fadeOpacity]);
    };
    Scene_Base.prototype.updateFade = function () {
        if (this._fadeDuration > 0) {
            const d = this._fadeDuration;
            if (this._fadeSign > 0) {
                this._fadeOpacity -= this._fadeOpacity / d;
            } else {
                this._fadeOpacity += (255 - this._fadeOpacity) / d;
            }
            this.updateColorFilter();
            this._fadeDuration--;
        } else {
            this.clearFilters();
        }
    };
    Scene_Title.prototype.createForeground = function () {
        const bitmap = new Bitmap(Graphics._width, Graphics._height);
        this._gameTitleSprite = new Sprite(bitmap);
        this.addChild(this._gameTitleSprite);
        if ($dataSystem.optDrawTitle) {
            this.drawGameTitle();
        }
    };
    Scene_Title.prototype.terminat = function () {
        SceneManager.snapForBackground();
    };
    Scene_Title.prototype.commandWindowRect = function () {
        const offsetX = $dataSystem.titleCommandWindow.offsetX;
        const offsetY = $dataSystem.titleCommandWindow.offsetY;
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(3, true);
        const wx = (Graphics.boxWidth - ww) / 2 + offsetX;
        const wy = Graphics.boxHeight - wh - 96 + offsetY;
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(wx, wy, ww, wh);
        return rect;
    };
    Scene_MenuBase.prototype.destroy = function (options) {
        BIGPOOL.return(this._backgroundFilter);
        this._backgroundFilter = null;
        Scene_Base.prototype.destroy.call(this, options);
    };
    Scene_Options.prototype.optionsWindowRect = function () {
        const n = Math.min(this.maxCommands(), this.maxVisibleCommands());
        const ww = 400;
        const wh = this.calcWindowHeight(n, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(wx, wy, ww, wh);
        return rect;
    };
    Scene_File.prototype.listWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop() + this._helpWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaHeight() - this._helpWindow.height;
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(wx, wy, ww, wh);
        return rect;
    };
    Scene_File.prototype.helpWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, false);
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(wx, wy, ww, wh);
        return rect;
    };
    class BackBlurSprite extends PIXI.Sprite {
        destroy(options) {
            options.texture = false;
            super.destroy(options);
        }
    }
    Scene_MenuBase.prototype.createBackground = function () {
        this._backgroundFilter = BIGPOOL.get(PIXI.BlurFilter);
        const sprite = (this._backgroundSprite = new BackBlurSprite(
            SceneManager.snapTexture
        ));
        const rect = BIGPOOL.get(Rectangle);
        sprite.filterArea = rect;
        rect.initialize(0, 0, Graphics.width, Graphics.height);
        sprite.filters = [this._backgroundFilter];
        this.addChild(sprite);
        this.setBackgroundOpacity(192);
    };
    PIXI.Container.prototype._normalRender = function (renderer) {
        if (this.visible) {
            this._render(renderer);
            const children = this.children;
            for (let i2 = 0, j2 = children.length; i2 < j2; ++i2) {
                const child = children[i2];
                if (child === void 0) continue;
                if (!child.isMask) child.render(renderer);
                child.update();
            }
        }
    }
    PIXI.Container.prototype.render = function (renderer) {
        if (this.visible) {
            this._render(renderer);
            const children = this.children;
            for (let i2 = 0, j2 = children.length; i2 < j2; ++i2) {
                const child = children[i2];
                if (child === void 0) continue;
                if (!child.isMask) child.render(renderer);
                child.update();
            }
        }
    }
    PIXI.Container.prototype._render = function (_renderer) {
        this.updateTransform();
    }
    Reflect.defineProperty(PIXI.Container, "mask", {
        get() {
            return this._mask;
        },
        set(value) {
            if (value === null) {
                if (this._mask) {
                    const maskObject = this._mask.isMaskData
                        ? this._mask.maskObject
                        : this._mask;
                    maskObject &&
                        (maskObject._maskRefCount--,
                            maskObject._maskRefCount === 0 &&
                            ((maskObject.renderable = !0), (maskObject.isMask = !1)));
                    this._mask = null;
                }
                this.render = this._normalRender;
            } else if (this._mask !== value) {
                this._mask = value;
                const maskObject = value.isMaskData ? value.maskObject : value;
                maskObject &&
                    (maskObject._maskRefCount === 0 &&
                        ((maskObject.renderable = false), (maskObject.isMask = true)),
                        maskObject._maskRefCount++);
                this.render = this._maskRender;
            }
        }
    })
    PIXI.Container.prototype._filterRender = function (renderer) {
        if (this.visible) {
            renderer.batch.flush();
            renderer.filter.push(this, this.filters);
            this._render(renderer);
            const children = this.children;
            for (let i = 0, length = children.length; i < length; i++) {
                const child = children[i];
                if (child === void 0) continue;
                if (!child.isMask) child.render(renderer);
                child.update();
            }
            renderer.batch.flush();
            renderer.filter.pop();
        }
    }
    PIXI.Container.prototype._maskRender = function (renderer) {
        if (this.visible) {
            renderer.batch.flush();
            const mask = this._mask;
            if (
                !mask.isMaskData ||
                (mask.enabled &&
                    (mask.autoDetect || mask.type !== PIXI.MASK_TYPES.NONE))
            ) {
                renderer.mask.push(this, mask);
            }
            this._render(renderer);
            const children = this.children;
            for (let i = 0, length = children.length; i < length; i++) {
                const child = children[i];
                if (child === void 0) continue;
                if (!child.isMask) child.render(renderer);
                child.update();
            }
            renderer.batch.flush();
            renderer.mask.pop();
        }
    }
    PIXI.Container.prototype.updateTransform = function () {
        const parent = this.parent;
        this._boundsID++;
        this.transform.updateTransform(parent.transform);
        this.worldAlpha = this.alpha * parent.worldAlpha;
        this.updateWorldPosition();
        this.updateFilterArea();
    }
    PIXI.Container.prototype.updateWorldPosition = function () {
    }
    PIXI.Container.prototype.updateFilterArea = function () {
    }
    PIXI.Container.prototype.addFilter = function (filter) {
        if (this.filters === null) this.filters = [];
        if (filter !== null && !this.filters.includes(filter)) {
            this.filters.push(filter);
            this.render = this._filterRender;
        }
    };
    PIXI.Container.prototype.destroy = function (options) {
        PIXI.DisplayObject.prototype.destroy.call(this, options);
        const children = this.removeChildren();
        for (let i = 0, l = children.length; i < l; i++) {
            children[i].destroy(options);
        }
    }
    PIXI.Container.prototype.move = function (x, y) {
        this.position.set(x, y);
    }
    PIXI.Container.prototype.removeFilter = function (filter) {
        if (filter !== null) {
            const index = this.filters.indexOf(filter);
            if (index !== -1) {
                this.filters.splice(index, 1);
            }
        }
        if (this.filters.length === 0) {
            this.render = this._normalRender;
        }
    };
    PIXI.Container.prototype.clearFilters = function () {
        for (const filter of this.filters) {
            BIGPOOL.return(filter);
        }
        this.updateFilterArea = Function.empty;
        this.filters.length = 0;
        this.render = this._normalRender;
    };
    PIXI.Container.prototype.update = function () {

    }
    Sprite.prototype.initialize = function (bitmap) {
        this._bitmap = bitmap;
        this.renderObj = Graphics.renderer.plugins["batch"];
        if (this.filters === null) {
            this.filters = [];
        }
        this.loadHandler = this._onBitmapLoad.bind(this);
        this.spriteId = Sprite._counter++;
        this._hue = 0;
        this._blendColor = [0, 0, 0, 0];
        this._colorTone = [0, 0, 0, 0];
        this._colorFilter = null;
        this._blendMode = PIXI.BLEND_MODES.NORMAL;
        this._hidden = false;
        this.worldPosition = BIGPOOL.get(Point);
        this.worldTestPoint = BIGPOOL.get(Point);
        this._onBitmapChange();
    };
    Sprite.prototype.setBlendColor = function (color) {
        this._blendColor = color;
        this._updateColorFilter();
    };
    Sprite.prototype.setColorTone = function (tone) {
        this._colorTone = tone;
        this._updateColorFilter();
    };
    Sprite.prototype.setHue = function (hue) {
        if (this._hue !== hue) {
            this._hue = hue;
            this._updateColorFilter();
        }
    };
    Sprite.prototype._onBitmapChange = function () {
        if (this._bitmap != null) {
            this._bitmap.addLoadListener(this.loadHandler);
        }
    };
    Sprite.prototype._onBitmapLoad = function (bitmapLoaded) {
        if (bitmapLoaded === this._bitmap) {
            const oldTexture = this._texture;
            if (oldTexture !== PIXI.Texture.EMPTY) {
                BIGPOOL.return(oldTexture);
            }
            const baseTexture = bitmapLoaded._baseTexture;
            const texture = BIGPOOL.get(PIXI.Texture);
            texture.initialize(baseTexture);
            this.texture = texture;
        }
    };
    PIXI.Texture.EMPTY.setFrame = Function.empty;
    PIXI.Texture.EMPTY.off = Function.empty;
    PIXI.Texture.EMPTY.on = Function.empty;
    Sprite.prototype.setFrame = function (x, y, width, height) {
        this._texture.setFrame(x, y, width, height);
    };
    Sprite.prototype.updateWorldPosition = function () {
        this.worldTestPoint.reset();
        this.worldTransform.apply(this.worldTestPoint, this.worldPosition);
    }
    Sprite.prototype.updateSpriteFilterArea = function () {
        const frame = this._texture._frame;
        const { width, height } = frame;
        const filterArea = this.filterArea;
        filterArea.width = width;
        filterArea.height = height;
        const position = this.worldPosition;
        const anchor = this._anchor;
        filterArea.x = position.x - (width * anchor._x)
        filterArea.y = position.y - (height * anchor._y);
    }
    Sprite.prototype.destroy = function () {
        const texture = this._texture;
        if (texture != null) {
            if (texture.isTexture) {
                BIGPOOL.return(texture);
            } else {
                if (texture !== PIXI.Texture.EMPTY) texture.destroy(true);
            }
        }
        if (this.filterArea !== null) {
            BIGPOOL.return(this.filterArea);
            this.filterArea = null;
            this._colorFilter = null;
        }
        if (this.hitArea) {
            BIGPOOL.return(this.hitArea);
            this.hitArea = null;
        }
        if (this.tempPoint) {
            BIGPOOL.return(this.tempPoint);
            this.tempPoint = null;
        }
        if (this._coldFrame) {
            BIGPOOL.return(this._coldFrame);
            BIGPOOL.return(this._hotFrame);
            this._coldFrame = null;
            this._hotFrame = null;
        }
        BIGPOOL.return(this.worldTestPoint);
        BIGPOOL.return(this.worldPosition);
        this.worldTestPoint = null;
        this.worldPosition = null;
        const bitmap = this._bitmap;
        if (bitmap != null && bitmap !== ImageManager._emptyBitmap) {
            if (bitmap._url === "") bitmap.destroy();
        }
        this._bitmap = null;
        PIXI.Sprite.prototype.destroy.call(this, { children: true });
    }
    Sprite.prototype._onTextureUpdate = function () {
        this._textureID = -1;
        this._textureTrimmedID = -1;
        this._cachedTint = 16777215;
        this.uvs = this._texture._uvs.uvsFloat32;
    }
    Sprite.prototype._render = function (renderer) {
        this.updateTransform();
        this.calculateVertices();
        renderer.batch.setObjectRenderer(this.renderObj);
        this.renderObj.render(this);
    };
    Sprite.prototype._createColorFilter = function () {
        const colorFilter = BIGPOOL.get(ColorFilter);
        this._colorFilter = colorFilter;
        this.filterArea = BIGPOOL.get(Rectangle);
        this.addFilter(colorFilter);
        this.updateFilterArea = this.updateSpriteFilterArea;
    };
    Reflect.defineProperty(Sprite.prototype, "width", {
        get() {
            return this.scale._x * this._texture._frame.width;
        },
        configurable: false,
    });
    Reflect.defineProperty(Sprite.prototype, "height", {
        get() {
            return this.scale._y * this._texture._frame.height;
        },
        configurable: false,
    });
    Sprite.prototype.calculateVertices = function () {
        const texture = this._texture;
        if (
            this._transformID === this.transform._worldID &&
            this._textureID === texture._updateID
        ) return;
        this._textureID !== texture._updateID &&
            (this.uvs = this._texture._uvs.uvsFloat32),
            (this._transformID = this.transform._worldID),
            (this._textureID = texture._updateID);
        const wt = this.transform.worldTransform,
            a2 = wt.a,
            b2 = wt.b,
            c2 = wt.c,
            d2 = wt.d,
            tx = wt.tx,
            ty = wt.ty,
            vertexData = this.vertexData,
            orig = texture.orig,
            anchor = this._anchor,
            width = orig.width,
            height = orig.height;
        const w1 = -anchor._x * width,
            w0 = w1 + width,
            h1 = -anchor._y * height,
            h0 = h1 + height;
        const w = a2 * w1;
        const d = d2 * h1;
        const a = a2 * w0;
        const dd = d2 * h0;
        const c = c2 * h1;
        const bb = b2 * w1;
        const ww = b2 * w0;
        const cc = c2 * h0;
        vertexData[0] = w + c + tx;
        vertexData[1] = d + bb + ty;
        vertexData[2] = a + c + tx;
        vertexData[3] = d + ww + ty;
        vertexData[4] = a + cc + tx;
        vertexData[5] = dd + ww + ty;
        vertexData[6] = w + cc + tx;
        vertexData[7] = dd + bb + ty;
    };
    TilingSprite.prototype.initialize = function (bitmap) {
        this._bitmap = bitmap;
        this._width = 0;
        this._height = 0;
        this.renderObj = Graphics.renderer.plugins["tilingSprite"];
        this.loadHandler = this._onBitmapLoad.bind(this);
        this.origin = BIGPOOL.get(Point);
        this._onBitmapChange();
    };
    TilingSprite.prototype._onTextureUpdate = function () {
        if (this.uvMatrix) {
            this.uvMatrix.texture = this._texture;
            this.uvMatrix.update(true);
        };
        this._cachedTint = 16777215;
        this.uvs = this._texture._uvs.uvsFloat32;
    }
    TilingSprite.prototype._onBitmapChange = function () {
        if (this._bitmap != null) this._bitmap.addLoadListener(this.loadHandler);
    };
    TilingSprite.prototype._onBitmapLoad = function (bitmapLoaded) {
        if (bitmapLoaded === this._bitmap) {
            const oldTexture = this._texture;
            if (oldTexture !== PIXI.Texture.EMPTY) {
                BIGPOOL.return(oldTexture);
            }
            const baseTexture = bitmapLoaded._baseTexture;
            const texture = BIGPOOL.get(PIXI.Texture);
            texture.initialize(baseTexture);
            this.texture = texture;
        }
    };
    TilingSprite.prototype.setFrame = function (x, y, width, height) {
        this._texture.setFrame(x, y, width, height);
    };
    TilingSprite.prototype._render = function (renderer) {
        this.tileTransform.updateLocalTransform();
        this.uvMatrix.update();
        renderer.batch.setObjectRenderer(this.renderObj);
        this.renderObj.render(this);
    };
    TilingSprite.prototype.destroy = function () {
        const texture = this._texture;
        if (texture.isTexture) {
            BIGPOOL.return(texture);
        } else {
            texture.destroy(true);
        }
        BIGPOOL.return(this.origin);
        this.origin = null;
        PIXI.TilingSprite.prototype.destroy.call(this, { children: true });
    }
    Sprite_Animation.prototype.setup = function (targets, animation, mirror, delay) {
        this._targets = targets;
        this._animation = animation;
        this._mirror = mirror;
        this._delay = delay;
        this._effect = EffectManager.load(animation.effectName);
        this._playing = true;
        const timings = animation.soundTimings.concat(animation.flashTimings);
        for (const timing of timings) {
            if (timing.frame > this._maxTimingFrames) {
                this._maxTimingFrames = timing.frame;
            }
        }
        const x = mirror ? -1 : 1;
        const y = -1;
        const p = -(this._viewportSize / Graphics._height);
        this.projectMatrix = [x, 0, 0, 0, 0, y, 0, 0, 0, 0, 1, p, 0, 0, 0, 1,];
        this.cameraMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -10, 1];
        this.enableRender = false;
    };
    Sprite_Animation.prototype.update = function () {
        if (this._delay > 0) {
            this._delay--;
        } else if (this._playing) {
            if (!this._started) {
                if (this._effect.isLoaded) {
                    this._handle = Graphics.effekseer.play(this._effect);
                    this._started = true;
                    this.enableRender = true;
                }
            } else {
                this.updateEffectGeometry();
                this.updateMain();
                this.updateFlash();
            }
        } else {
            this.enableRender = false;
        }
    }
    Sprite_Animation.prototype.setViewport = function (renderer) {
        const animation = this._animation;
        const vw = 4096;
        const vh = 4096;
        const vx = animation.offsetX - 2048;
        const vy = animation.offsetY - 2048;
        let x = 0, y = 0;
        if (animation.displayType === 2) {
            x = Graphics._width / 2;
            y = Graphics._height / 2;
        } else {
            const targets = this._targets;
            const length = targets.length;
            for (let i = 0; i < length; i++) {
                const sprite = targets[i];
                const pos = this.targetSpritePosition(sprite);
                x += pos.x;
                y += pos.y;
            }
            x /= length;
            y /= length;
        }
        renderer.gl.viewport(vx + x, vy + y, vw, vh);
    };
    Sprite_Animation.prototype.targetSpritePosition = function (sprite) {
        const point = sprite.worldPosition;
        point.y -= sprite._texture._frame.height / 2;
        if (this._animation.alignBottom) {
            point.y = 0;
        }
        return point;
    }
    Sprite_Animation.prototype.updateEffectGeometry = function () {
        const animation = this._animation;
        const rotation = animation.rotation;
        const handle = this._handle;
        const scale = animation.scale / 100;
        const r = Math.PI / 180;
        const rx = rotation.x * r;
        const ry = rotation.y * r;
        const rz = rotation.z * r;
        handle.setLocation(0, 0, 0);
        handle.setRotation(rx, ry, rz);
        handle.setScale(scale, scale, scale);
        handle.setSpeed(animation.speed / 100);
    }
    Sprite_Animation.prototype._render = function (renderer) {
        if (this.enableRender) {
            this.onBeforeRender(renderer);
            const effekseer = Graphics._effekseer;
            effekseer.setProjectionMatrix(this.projectMatrix);
            effekseer.setCameraMatrix(this.cameraMatrix);
            this.setViewport(renderer);
            effekseer.beginDraw();
            effekseer.drawHandle(this._handle);
            effekseer.endDraw();
            this.resetViewport(renderer);
            this.onAfterRender(renderer);
        }
    };
    Window.prototype.initialize = function () {
        this._isWindow = true;
        this._windowskin = null;
        this._width = 0;
        this._height = 0;
        this._innerWidth = 0;
        this._innerHeight = 0;
        this._innerRect = BIGPOOL.get(Rectangle);
        this._cursorRect = BIGPOOL.get(Rectangle);
        this._openness = 255;
        this._animationCount = 0;
        this._padding = 12;
        this._margin = 4;
        this._colorTone = [0, 0, 0, 0];
        this._innerChildren = [];
        this._container = null;
        this._backSprite = null;
        this._frameSprite = null;
        this._contentsBackSprite = null;
        this._cursorSprite = null;
        this._contentsSprite = null;
        this._downArrowSprite = null;
        this._upArrowSprite = null;
        this._pauseSignSprite = null;
        this.frameRect = BIGPOOL.get(Rectangle);
        this.frame = BIGPOOL.get(Rectangle);
        this.frame.initialize(96, 0, 96, 96);
        this.windowFrame = BIGPOOL.get(Rectangle);
        this.windowFrame.initialize(0, 0, 0, 0);
        this.dRect = BIGPOOL.get(Rectangle);
        this.dRect.initialize(96, 96, 48, 48);
        this.origin = BIGPOOL.get(Point);
        this.active = true;
        this.frameVisible = true;
        this.cursorVisible = true;
        this.downArrowVisible = false;
        this.upArrowVisible = false;
        this.pause = false;
        this.hitPoint = BIGPOOL.get(Point);
        this._createAllParts();
    };
    Window.prototype._createBackSprite = function () {
        this._backSprite = new Sprite();
        this._container.addChild(this._backSprite);
    }
    Window.prototype._refreshBack = function () {
        const m = this._margin;
        const w = Math.max(0, this._width - m * 2);
        const h = Math.max(0, this._height - m * 2);
        const sprite = this._backSprite;
        sprite.bitmap = this._windowskin;
        sprite.setFrame(0, 0, 95, 95);
        sprite.move(m, m);
        const sx = w / 95;
        const sy = h / 95;
        sprite.scale.set(sx, sy);
    };
    Window.prototype._refreshAllParts = function () {
        if (!this.enableRefresh) return;
        this._refreshBack();
        this._refreshFrame();
        this._refreshCursor();
        this._refreshArrows();
        this._refreshPauseSign();
    };
    Window.prototype.destroy = function (options) {
        BIGPOOL.return(this._innerRect);
        BIGPOOL.return(this._cursorRect);
        BIGPOOL.return(this.hitPoint);
        BIGPOOL.return(this.origin);
        BIGPOOL.return(this.frameRect);
        BIGPOOL.return(this.frame);
        BIGPOOL.return(this.dRect);
        BIGPOOL.return(this.windowFrame);
        if (this._textBaseRect) {
            BIGPOOL.return(this._textBaseRect);
            this._textBaseRect = null;
        }
        if (this._reservedRect) {
            BIGPOOL.return(this._reservedRect);
            this._reservedRect = null;
        }
        if (this._itemRect) {
            BIGPOOL.return(this._itemRect);
            this._itemRect = null;
        }
        if (this._backRect) {
            BIGPOOL.return(this._backRect);
            BIGPOOL.return(this._lineRect);
            this._backRect = null;
            this._lineRect = null;
        }
        this.frameRect = null;
        this._innerRect = null;
        this._cursorRect = null;
        this.tempPoint = null;
        this.filterPoint = null;
        this.hitPoint = null;
        this.origin = null;
        this.frameRect = null;
        this.frame = null;
        this.dRect = null;
        this.windowFrame = null;
        PIXI.Container.prototype.destroy.call(this, options);
    };

    Window.prototype._refreshFrame = function () {
        const drect = this.windowFrame;
        const srect = this.frame;
        const m = 24;
        this._setRectPartsGeometry(this._frameSprite, srect, drect, m);
    };
    Window.prototype._setRectPartsGeometry = function (sprite, srect, drect, m) {
        const sx = srect.x;
        const sy = srect.y;
        const sw = srect.width;
        const sh = srect.height;
        const dx = drect.x;
        const dy = drect.y;
        const dw = drect.width;
        const dh = drect.height;
        const smw = sw - m * 2;
        const smh = sh - m * 2;
        const dmw = dw - m * 2;
        const dmh = dh - m * 2;
        const children = sprite.children;
        const bitmap = this._windowskin;
        sprite.position.set(dx, dy);
        children[0].bitmap = bitmap;
        children[0].setFrame(sx, sy, m, m);
        children[1].bitmap = bitmap;
        children[1].setFrame(sx + sw - m, sy, m, m);
        children[2].bitmap = bitmap;
        children[2].setFrame(sx, sy + sw - m, m, m);
        children[3].bitmap = bitmap;
        children[3].setFrame(sx + sw - m, sy + sw - m, m, m);
        children[0].move(0, 0);
        children[1].move(dw - m, 0);
        children[2].move(0, dh - m);
        children[3].move(dw - m, dh - m);
        children[4].bitmap = bitmap;
        children[4].move(m, 0);
        children[5].bitmap = bitmap;
        children[5].move(m, dh - m);
        children[6].bitmap = bitmap;
        children[6].move(0, m);
        children[7].bitmap = bitmap;
        children[7].move(dw - m, m);
        children[4].setFrame(sx + m, sy, smw, m);
        children[5].setFrame(sx + m, sy + sw - m, smw, m);
        children[6].setFrame(sx, sy + m, m, smh);
        children[7].setFrame(sx + sw - m, sy + m, m, smh);
        children[4].scale.x = dmw / smw;
        children[5].scale.x = dmw / smw;
        children[6].scale.y = dmh / smh;
        children[7].scale.y = dmh / smh;
        if (children[8] !== void 0) {
            const center = children[8];
            center.bitmap = bitmap;
            center.setFrame(sx + m, sy + m, smw, smh);
            center.move(m, m);
            const scale = center.scale;
            scale.set(dmw / smw, dmh / smh);
        }
        sprite.visible = dw > 0 && dh > 0;
    };
    Window_Base.prototype.createContents = function () {
        if (this.contents === void 0) {
            const contents = new Bitmap(100, 100);
            const contentsBack = new Bitmap(100, 100);
            this.contents = contents;
            this.contentsBack = contentsBack;
        }
        const contentsSprite = this._contentsSprite;
        const contentsBack = this._contentsBackSprite;
        const width = this.contentsWidth();
        const height = this.contentsHeight();
        this.contents.resize(width, height);
        this.contentsBack.resize(width, height);
        contentsBack.setFrame(0, 0, width, height);
        contentsSprite.setFrame(0, 0, width, height);
        this.resetFontSettings();
    };
    Window.prototype._createCursorSprite = function () {
        const sprite = (this._cursorSprite = new Sprite());
        this._clientArea.addChild(sprite);
    };
    Window.prototype._refreshCursor = function () {
        const drect = this._cursorRect;
        const sprite = this._cursorSprite;
        sprite.bitmap = this._windowskin;
        sprite.setFrame(100, 100, 38, 38);
        this.refreshCursorRect(drect);
    };
    Window.prototype.setCursorRect = function (x, y, width, height) {
        const cw = width;
        const ch = height;
        const cursorRect = this._cursorRect;
        cursorRect.x = x;
        cursorRect.y = y;
        if (cursorRect.width !== cw || cursorRect.height !== ch) {
            cursorRect.width = cw;
            cursorRect.height = ch;
            this.refreshCursorRect(cursorRect);
        }
    };
    Window.prototype.refreshCursorRect = function (rect) {
        const { width, height } = rect;
        const sprite = this._cursorSprite;
        const sx = width / 38;
        const sy = height / 38;
        sprite.scale.set(sx, sy);
    };
    Window.prototype._updateCursor = function () {
        const sprite = this._cursorSprite;
        const cr = this._cursorRect;
        sprite.alpha = this._makeCursorAlpha();
        sprite.visible = this.isOpen() && this.cursorVisible;
        sprite.position.set(cr.x, cr.y);
    };
    Window.prototype._refreshAllParts = function () {
        if (!this.enableRefresh) return;
        this._refreshBack();
        this._refreshFrame();
        this._refreshCursor();
        this._refreshArrows();
        this._refreshPauseSign();
    };
    Window.prototype._onWindowskinLoad = function () {
        this.enableRefresh = true;
        this._refreshAllParts();
    };
    Window.prototype.move = function (x = 0, y = 0, width, height) {
        this.position.set(x, y);
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this.windowFrame.width = width;
            this.windowFrame.height = height;
            const rect = this._innerRect;
            const padding = this._padding;
            const innerWidth = Math.max(width - padding * 2, 0);
            const innerHeight = Math.max(height - padding * 2, 0);
            rect.width = innerWidth;
            rect.height = innerHeight;
            this._innerWidth = innerWidth;
            this._innerHeight = innerHeight;
            this._refreshAllParts();
        }
    };
    Window.prototype._updatePauseSign = function () {
        const visible = this.isOpen();
        const sprite = this._pauseSignSprite;
        sprite.visible = visible;
        if (visible === false) return;
        const count = (this._animationCount / 16) >> 0;
        const x = count % 2;
        const y = ((count / 2) >> 0) % 2;
        const sx = 144;
        const sy = 96;
        const p = 24;
        if (!this.pause) {
            sprite.alpha = 0;
        } else if (sprite.alpha < 1) {
            sprite.alpha = Math.min(sprite.alpha + 0.1, 1);
        }
        sprite.alpha > 0 && sprite.setFrame(sx + x * p, sy + y * p, p, p);
    };
    Window.prototype._updateClientArea = function () {
        const pad = this._padding;
        const orign = this.origin;
        const sprite = this._clientArea;
        sprite.move(pad - orign.x, pad - orign.y);
        sprite.visible = this.isOpen();
    };
    class Window_ClientContainer extends PIXI.Container {
        constructor() {
            super();
            this.tempPoint = BIGPOOL.get(Point);
            this.filterPoint = BIGPOOL.get(Point);
            this.addFilter(BIGPOOL.get(PIXI.AlphaFilter));
            this.filterArea = BIGPOOL.get(Rectangle);
        }
        updateTransform() {
            const parent = this.parent;
            const point = parent.origin;
            const x = point.x;
            const y = point.y;
            this._boundsID++;
            this.transform.updateTransform(parent.transform);
            const tempPoint = this.tempPoint;
            const filterPoint = this.filterPoint;
            this.worldTransform.apply(tempPoint, filterPoint);
            const filterArea = this.filterArea;
            const px = filterPoint.x;
            const py = filterPoint.y;
            const w = parent._innerWidth;
            const h = parent._innerHeight;
            filterArea.x = px + x;
            filterArea.y = py + y;
            filterArea.width = w;
            filterArea.height = h;
        }
        destroy(options) {
            this.clearFilters();
            BIGPOOL.return(this.tempPoint);
            BIGPOOL.return(this.filterPoint);
            this.tempPoint = null;
            this.filterPoint = null;
            super.destroy(options);
        }
    }
    Window.prototype._createClientArea = function () {
        const container = this._clientArea = new Window_ClientContainer();
        container.move(this._padding, this._padding);
        this.addChild(this._clientArea);
    };
    Window.prototype._makeCursorAlpha = function () {
        const blinkCount = this._animationCount % 40;
        const baseAlpha = this._contentsSprite.alpha;
        if (this.active) {
            if (blinkCount < 20) {
                return baseAlpha - blinkCount / 32;
            } else {
                return baseAlpha - (40 - blinkCount) / 32;
            }
        }
        return baseAlpha;
    };
    Reflect.defineProperty(Window.prototype, "width", {
        get: function () {
            return this._width;
        },
        set: function (value) {
            this._width = value;
            const innerWidth = Math.max(value - this._padding * 2, 0);
            this._innerWidth = innerWidth;
            this._innerRect.width = innerWidth;
            this.windowFrame.width = value;
            this._refreshAllParts();
        },
        configurable: false,
    });
    Reflect.defineProperty(Window.prototype, "height", {
        get: function () {
            return this._height;
        },
        set: function (value) {
            this._height = value;
            const innerHeight = Math.max(value - this._padding * 2, 0);
            this._innerHeight = innerHeight;
            this._innerRect.height = innerHeight;
            this.windowFrame.height = value;
            this._refreshAllParts();
        },
        configurable: false,
    });
    Reflect.defineProperty(Window.prototype, "padding", {
        get: function () {
            return this._padding;
        },
        set: function (value) {
            this._padding = value;
            this._innerRect.x = value;
            this._innerRect.y = value;
            this._refreshAllParts();
        },
        configurable: false,
    });
    Reflect.defineProperty(Window.prototype, "innerWidth", {
        get: function () {
            return this._innerWidth;
        },
        configurable: false,
    });
    Reflect.defineProperty(Window.prototype, "innerHeight", {
        get: function () {
            return this._innerHeight;
        },
        configurable: false,
    });
    Object.defineProperty(Window.prototype, "innerRect", {
        get: function () {
            return this._innerRect;
        },
        configurable: false,
    });
    Window_Base.prototype.initialize = function (rect) {
        Window.prototype.initialize.call(this);
        this._textBaseRect = BIGPOOL.get(Rectangle);
        this.loadWindowskin();
        this.move(rect.x, rect.y, rect.width, rect.height);
        BIGPOOL.return(rect);
        this.updatePadding();
        this.updateBackOpacity();
        this.updateTone();
        this.createContents();
        this._opening = false;
        this._closing = false;
        this._dimmerSprite = null;
    };
    Window_Base.prototype.baseTextRect = function () {
        const rect = this._textBaseRect;
        rect.reset();
        rect.width = this._innerWidth;
        rect.height = this._innerHeight;
        rect.pad(-this.itemPadding(), 0);
        return rect;
    };
    Window_Base.prototype.drawIcon = function (iconIndex, x, y) {
        const bitmap = ImageManager.loadSystem("IconSet");
        const pw = ImageManager.iconWidth;
        const ph = ImageManager.iconHeight;
        const sx = (iconIndex % 16) * pw;
        const sy = ((iconIndex / 16) >> 0) * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y);
    };
    Window_Base.prototype.drawFace = function (
        faceName,
        faceIndex,
        x,
        y,
        width,
        height
    ) {
        width = width || 144;
        height = height || 144;
        const bitmap = ImageManager.loadFace(faceName);
        const pw = 144;
        const ph = 144;
        const sw = Math.min(width, pw);
        const sh = Math.min(height, ph);
        const dx = (x + Math.max(width - pw, 0) / 2) >> 0;
        const dy = (y + Math.max(height - ph, 0) / 2) >> 0;
        const sx = ((faceIndex % 4) * pw + (pw - sw) / 2) >> 0;
        const sy = (((faceIndex / 4) >> 0) * ph + (ph - sh) / 2) >> 0;
        this.contents.blt(bitmap, sx, sy, sw, sh, dx, dy);
    };
    Window_Base.prototype.drawCharacter = function (
        characterName,
        characterIndex,
        x,
        y
    ) {
        const bitmap = ImageManager.loadCharacter(characterName);
        const big = ImageManager.isBigCharacter(characterName);
        const pw = bitmap.width / (big ? 3 : 12);
        const ph = bitmap.height / (big ? 4 : 8);
        const n = big ? 0 : characterIndex;
        const sx = ((n % 4) * 3 + 1) * pw;
        const sy = ((n / 4) >> 0) * 4 * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x - pw / 2, y - ph);
    };
    Window_Scrollable.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        this.processWheelScroll();
        this.processTouchScroll();
        this.updateSmoothScroll();
        this.updateScrollAccel();
    };
    Window_Scrollable.prototype.updateOrigin = function () {
        const blockWidth = this.scrollBlockWidth() || 1;
        const blockHeight = this.scrollBlockHeight() || 1;
        const scrollX = this._scrollX;
        const scrollY = this._scrollY;
        const realScrollX = scrollX % blockWidth;
        const realScrollY = scrollY % blockHeight;
        const baseX = scrollX - realScrollX;
        const baseY = scrollY - realScrollY;
        if (baseX !== this._scrollBaseX || baseY !== this._scrollBaseY) {
            this.updateScrollBase(baseX, baseY);
            this.paint();
        }
        this.origin.set(realScrollX, realScrollY);
    };
    Window_Scrollable.prototype.overallWidth = function () {
        return this._innerWidth;
    };
    Window_Scrollable.prototype.overallHeight = function () {
        return this._innerHeight;
    };
    Window_Scrollable.prototype.maxScrollX = function () {
        return Math.max(0, this.overallWidth() - this._innerWidth);
    };
    Window_Scrollable.prototype.maxScrollY = function () {
        return Math.max(0, this.overallHeight() - this._innerHeight);
    };
    Window_Selectable.prototype.itemWidth = function () {
        return (this._innerWidth / this.maxCols()) >> 0;
    };
    Window_Selectable.prototype.maxPageRows = function () {
        return (this._innerHeight / this.itemHeight()) >> 0;
    };
    Window_Selectable.prototype.refreshCursor = function () {
        const index = this._index;
        if (this._cursorAll) {
            this.refreshCursorForAll();
        } else if (index >= 0) {
            const rect = this.itemRect(index);
            this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            this.setCursorRect(0, 0, 0, 0);
        }
    };
    Window_Selectable.prototype.select = function (index) {
        if (this._index !== index) {
            this._index = index;
            this.refreshCursor();
            this.callUpdateHelp();
        }
    };
    Window_Selectable.prototype.processCursorMove = function () {
        if (this.isCursorMovable()) {
            const lastIndex = this._index;
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
            if (this._index !== lastIndex) {
                this.playCursorSound();
            }
        }
    };
    Window_Selectable.prototype.drawAllItems = function () {
        const topIndex = this.topIndex();
        const maxItems = this.maxItems();
        for (let i = 0; i < this.maxVisibleItems(); i++) {
            const index = topIndex + i;
            if (index < maxItems) {
                this.drawItemBackground(index);
                this.drawItem(index);
            }
        }
    };
    Window_Selectable.prototype.maxVisibleItems = function () {
        const visibleRows = (this._innerHeight / this.itemHeight()) >> 0;
        return visibleRows * this.maxCols();
    };
    Window_Selectable.prototype.cursorDown = function (wrap) {
        const index = this._index;
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        if (index < maxItems - maxCols || (wrap && maxCols === 1)) {
            const newIndex = (index + maxCols) % maxItems;
            this.smoothSelect(newIndex);
        }
    };
    Window_Selectable.prototype.cursorUp = function (wrap) {
        const index = Math.max(0, this._index);
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        if (index >= maxCols || (wrap && maxCols === 1)) {
            this.smoothSelect((index - maxCols + maxItems) % maxItems);
        }
    };
    Window_Selectable.prototype.cursorRight = function (wrap) {
        const index = this._index;
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        const horizontal = this.isHorizontal();
        if (maxCols >= 2 && (index < maxItems - 1 || (wrap && horizontal))) {
            this.smoothSelect((index + 1) % maxItems);
        }
    };
    Window_Selectable.prototype.cursorLeft = function (wrap) {
        const index = Math.max(0, this._index);
        const maxItems = this.maxItems();
        const maxCols = this.maxCols();
        const horizontal = this.isHorizontal();
        if (maxCols >= 2 && (index > 0 || (wrap && horizontal))) {
            this.smoothSelect((index - 1 + maxItems) % maxItems);
        }
    };
    Window_Command.prototype.initialize = function (rect) {
        this._list = [];
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.select(0);
        this.activate();
    };
    Window_Command.prototype.clearCommandList = function () {
        this._list.length = 0;
    };
    Window_NameBox.prototype.initialize = function () {
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(0, 0, 50, 50);
        Window_Base.prototype.initialize.call(this, rect);
        this.openness = 0;
        this._name = "";
    };
    Window_ChoiceList.prototype.initialize = function () {
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(0, 0, 50, 50);
        Window_Command.prototype.initialize.call(this, rect);
        this.createCancelButton();
        this.openness = 0;
        this.deactivate();
        this._background = 0;
        this._canRepeat = false;
    };
    Window_NameEdit.prototype.itemRect = function (index) {
        const x = this.left() + index * this.charWidth();
        const y = 54;
        const width = this.charWidth();
        const height = this.lineHeight();
        const rect = this._itemRect;
        rect.x = x;
        rect.y = y;
        rect.width = width;
        rect.height = height;
        return rect;
    };
    Window_ShopNumber.prototype.itemRect = function () {
        const rect = this._itemRect;
        rect.x = this.cursorX();
        rect.y = this.itemNameY();
        rect.width = this.cursorWidth();
        rect.height = this.lineHeight();
        return rect;
    };
    Window_NumberInput.prototype.initialize = function () {
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(0, 0, 50, 50);
        Window_Selectable.prototype.initialize.call(this, rect);
        this._number = 0;
        this._maxDigits = 1;
        this.openness = 0;
        this.createButtons();
        this.deactivate();
        this._canRepeat = false;
    };
    Window_NameBox.prototype.setName = function (name) {
        if (name === "") {
            this.close();
            this.name = name;
            return;
        }
        if (this._name !== name) {
            this._name = name;
            this.refresh();
            this.open()
        }
    }
    Window_NameBox.prototype.start = function () {
        if (this.name === "") return;
        this.updatePlacement();
        this.updateBackground();
        this.createContents();
        this.refresh();
    }
    Window_NameInput.prototype.itemRect = function (index) {
        const itemWidth = this.itemWidth();
        const itemHeight = this.itemHeight();
        const colSpacing = this.colSpacing();
        const rowSpacing = this.rowSpacing();
        const groupSpacing = this.groupSpacing();
        const col = index % 10;
        const group = (col / 5) >> 0;
        const x = col * itemWidth + group * groupSpacing + colSpacing / 2;
        const y = ((index / 10) >> 0) * itemHeight + rowSpacing / 2;
        const width = itemWidth - colSpacing;
        const height = itemHeight - rowSpacing;
        const rect = this._itemRect;
        rect.x = x;
        rect.y = y;
        rect.width = width;
        rect.height = height;
        return rect;
    };
    Window_ScrollText.prototype.initialize = function () {
        const rect = BIGPOOL.get(Rectangle);
        rect.initialize(0, 0, 50, 50);
        Window_Base.prototype.initialize.call(this, rect);
        this.opacity = 0;
        this.hide();
        this._reservedRect = BIGPOOL.get(Rectangle);
        this._text = "";
        this._maxBitmapHeight = 2048;
        this._allTextHeight = 0;
        this._blockHeight = 0;
        this._blockIndex = 0;
        this._scrollY = 0;
    };
    Window_Selectable.prototype.initialize = function (rect) {
        Window_Scrollable.prototype.initialize.call(this, rect);
        this._index = -1;
        this._cursorFixed = false;
        this._cursorAll = false;
        this._helpWindow = null;
        this._handlers = {};
        this._doubleTouch = false;
        this._canRepeat = true;
        this._itemRect = BIGPOOL.get(Rectangle);
        this.deactivate();
    };
    Window_Selectable.prototype.itemRect = function (index) {
        const maxCols = this.maxCols();
        const itemWidth = this.itemWidth();
        const itemHeight = this.itemHeight();
        const colSpacing = this.colSpacing();
        const rowSpacing = this.rowSpacing();
        const col = index % maxCols;
        const row = (index / maxCols) >> 0;
        const x = col * itemWidth + colSpacing / 2 - this.scrollBaseX();
        const y = row * itemHeight + rowSpacing / 2 - this.scrollBaseY();
        const width = itemWidth - colSpacing;
        const height = itemHeight - rowSpacing;
        const rect = this._itemRect;
        rect.x = x;
        rect.y = y;
        rect.width = width;
        rect.height = height;
        return rect;
    };
    Window_Selectable.prototype.hitIndex = function () {
        const hitPoint = this.hitPoint;
        this.worldTransform.applyInverse(TouchInput.point, hitPoint);
        return this.hitTest(hitPoint.x, hitPoint.y);
    };
    Window_Scrollable.prototype.isTouchedInsideFrame = function () {
        const hitPoint = this.hitPoint;
        this.worldTransform.applyInverse(TouchInput.point, hitPoint);
        return this._innerRect.contains(hitPoint.x, hitPoint.y);
    };
    Window_Selectable.prototype.hitTest = function (x, y) {
        if (this._innerRect.contains(x, y)) {
            const padding = this._padding;
            const origin = this.origin;
            const cx = origin.x + x - padding;
            const cy = origin.y + y - padding;
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
    };
    Window_BattleLog.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._backRect = BIGPOOL.get(Rectangle);
        this._lineRect = BIGPOOL.get(Rectangle);
        this.opacity = 0;
        this._lines = [];
        this._methods = [];
        this._waitCount = 0;
        this._waitMode = "";
        this._baseLineStack = [];
        this._spriteset = null;
        this.refresh();
    };
    Window_BattleLog.prototype.backRect = function () {
        const rect = this._backRect;
        rect.height = this.numLines() * this.itemHeight();
        rect.width = this._innerWidth;
        return rect;
    };
    Window_BattleLog.prototype.lineRect = function (index) {
        const itemHeight = this.itemHeight();
        const padding = this.itemPadding();
        const x = padding;
        const y = index * itemHeight;
        const width = this.innerWidth - padding * 2;
        const height = itemHeight;
        const rect = this._lineRect;
        rect.x = x;
        rect.y = y;
        rect.width = width;
        rect.height = height;
        return rect;
    };
    const staticState = {
        triggered: false,
        cancelled: false,
        moved: false,
        hovered: false,
        released: false,
        wheelX: 0,
        wheelY: 0,
    };
    TouchInput.point = new Point();
    TouchInput.clear = function () {
        this._mousePressed = false;
        this._screenPressed = false;
        this._pressedTime = 0;
        this.point.set(0, 0);
        this._clicked = false;
        this._newState = Object.assign({}, staticState);
        this._currentState = Object.assign({}, staticState);
        this._triggerX = 0;
        this._triggerY = 0;
        this._moved = false;
        this._date = 0;
    };
    TouchInput.update = function () {
        this._copyLastState(this._currentState, this._newState);
        this._resetNewState();
        this._clicked = this._currentState.released && !this._moved;
        if (this.isPressed()) {
            this._pressedTime++;
        }
    };
    TouchInput._copyLastState = function (target, source) {
        target.triggered = source.triggered;
        target.cancelled = source.cancelled;
        target.moved = source.moved;
        target.hovered = source.hovered;
        target.released = source.released;
        target.wheelX = source.wheelX;
        target.wheelY = source.wheelY;
    };
    TouchInput._resetNewState = function () {
        const state = this._newState;
        state.triggered = false;
        state.cancelled = false;
        state.moved = false;
        state.hovered = false;
        state.released = false;
        state.wheelX = 0;
        state.wheelY = 0;
    };
    TouchInput._onTrigger = function (x, y) {
        this._newState.triggered = true;
        this._triggerX = x;
        this._triggerY = y;
        this._moved = false;
        this.point.set(x, y);
        this._date = Date.now();
    };
    TouchInput._onCancel = function (x, y) {
        this._newState.cancelled = true;
        this.point.set(x, y);
    };
    TouchInput._onMove = function (x, y) {
        const dx = Math.abs(x - this._triggerX);
        const dy = Math.abs(y - this._triggerY);
        if (dx > this.moveThreshold || dy > this.moveThreshold) {
            this._moved = true;
        }
        if (this._moved) {
            this._newState.moved = true;
            this.point.set(x, y);
        }
    };
    TouchInput._onHover = function (x, y) {
        this._newState.hovered = true;
        this.point.set(x, y);
    };

    TouchInput._onRelease = function (x, y) {
        this._newState.released = true;
        this.point.set(x, y);
    };
    Reflect.defineProperty(TouchInput, "x", {
        get: function () {
            return this.point.x;
        },
        configurable: false,
    });

    Object.defineProperty(TouchInput, "y", {
        get: function () {
            return this.point.y;
        },
        configurable: false,
    });
    Reflect.deleteProperty(TouchInput, "_createNewState");
    Sprite_Clickable.prototype.isBeingTouched = function () {
        this.worldTransform.applyInverse(TouchInput.point, this.tempPoint);
        return this.hitArea.contains(this.tempPoint.x, this.tempPoint.y);
    };
    Sprite_Clickable.prototype.initialize = function () {
        this.tempPoint = BIGPOOL.get(Point);
        this.hitArea = BIGPOOL.get(Rectangle);
        Sprite.prototype.initialize.call(this);
        this._pressed = false;
        this._hovered = false;
    };
    Sprite_Clickable.prototype.setFrame = function (x, y, width, height) {
        const hitArea = this.hitArea;
        hitArea.width = width;
        hitArea.height = height;
        Sprite.prototype.setFrame.call(this, x, y, width, height);
    };
    Sprite_Clickable.prototype.processTouch = function () {
        if (this.isBeingTouched()) {
            if (!this._hovered && TouchInput.isHovered()) {
                this._hovered = true;
                this.onMouseEnter();
            }
            if (TouchInput.isTriggered()) {
                this._pressed = true;
                this.onPress();
            }
            if (TouchInput.isReleased()) this.onMouseRaise();
        } else {
            if (this._hovered) this.onMouseExit();
            this._pressed = false;
            this._hovered = false;
        }
    };
    Sprite_Clickable.prototype.onMouseRaise = function () {
        //
    };
    Reflect.deleteProperty(Sprite_Clickable.prototype, "hitTest");
    Sprite_Button.prototype.initialize = function (buttonType) {
        Sprite_Clickable.prototype.initialize.call(this);
        this._buttonType = buttonType;
        this._clickHandler = null;
        this._coldFrame = null;
        this._hotFrame = null;
        this.setupFrames();
    };
    Sprite_Button.prototype._onBitmapLoad = function (bitmapLoaded) {
        Sprite.prototype._onBitmapLoad.call(this, bitmapLoaded);
        this.refreshButtonFrame(this._coldFrame);
        this.opacity = 192;
    };
    Sprite_Button.prototype.refreshButtonFrame = function (frame) {
        this.setFrame(frame.x, frame.y, frame.width, frame.height);
    };
    Sprite_Button.prototype.setupFrames = function () {
        const data = this.buttonData();
        const x = data.x * this.blockWidth();
        const width = data.w * this.blockWidth();
        const height = this.blockHeight();
        const coldFrame = BIGPOOL.get(Rectangle);
        coldFrame.initialize(x, 0, width, height);
        const hotFrame = BIGPOOL.get(Rectangle);
        hotFrame.initialize(x, height, width, height);
        this._coldFrame = coldFrame;
        this._hotFrame = hotFrame;
        this.loadButtonImage();
    };
    Sprite_Button.prototype.onMouseRaise = function () {
        this.refreshButtonFrame(this._coldFrame);
        this.opacity = 192;
        if (this._clickHandler) {
            this._clickHandler();
        } else {
            Input.virtualClick(this._buttonType);
        }
    };
    Sprite_Button.prototype.onPress = function () {
        this.refreshButtonFrame(this._hotFrame);
        this.opacity = 192;
    };
    Tilemap.prototype.initialize = function () {
        this._width = Graphics.width;
        this._height = Graphics.height;
        this._margin = 20;
        this._mapWidth = 0;
        this._mapHeight = 0;
        this._mapData = null;
        if (this._bitmaps === void 0) {
            this._bitmaps = [];
        }
        if (this.sortHandler === void 0) {
            this.sortHandler = this._compareChildOrder.bind(this);
        }
        this.tileWidth = 48;
        this.tileHeight = 48;
        this.origin = BIGPOOL.get(Point);
        this.flags = [];
        this.animationCount = 0;
        this.horizontalWrap = false;
        this.verticalWrap = false;
        this._createLayers();
        this.refresh();
    };
    Tilemap.prototype.destroy = function (options) {
        BIGPOOL.return(this.origin);
        this.origin = null;
        PIXI.Container.prototype.destroy.call(this, DESTROY_OPTIONS);
    }
    Tilemap.prototype.update = function () {
        this.animationCount++;
        this.animationFrame = (this.animationCount / 30) >> 0;
        const origin = this.origin;
        const ox = Math.ceil(origin.x);
        const oy = Math.ceil(origin.y);
        const startX = ((ox - 20) / 48) >> 0;
        const startY = ((oy - 20) / 48) >> 0;
        const sx = startX * 48 - ox;
        const sy = startY * 48 - oy;
        this._lowerLayer.position.set(sx, sy);
        this._upperLayer.position.set(sx, sy);
        if (
            this._needsRepaint ||
            this._lastAnimationFrame !== this.animationFrame ||
            this._lastStartX !== startX ||
            this._lastStartY !== startY
        ) {
            this._lastAnimationFrame = this.animationFrame;
            this._lastStartX = startX;
            this._lastStartY = startY;
            this._addAllSpots(startX, startY);
            this._needsRepaint = false;
        }
        this._sortChildren();
    }
    Tilemap.prototype._addAllSpots = function (startX, startY) {
        this._lowerLayer.clear();
        this._upperLayer.clear();
        const widthWithMatgin = this._width + 40;
        const heightWithMatgin = this._height + 40;
        const tileCols = Math.ceil(widthWithMatgin / 48) + 1;
        const tileRows = Math.ceil(heightWithMatgin / 48) + 1;
        for (let y = 0; y < tileRows; y++) {
            for (let x = 0; x < tileCols; x++) {
                this._addSpot(startX, startY, x, y);
            }
        }
    };
    Tilemap.prototype._addSpot = function (startX, startY, x, y) {
        const mx = startX + x;
        const my = startY + y;
        const dx = x * 48;
        const dy = y * 48;
        const tileId0 = this._readMapData(mx, my, 0);
        const tileId1 = this._readMapData(mx, my, 1);
        const tileId2 = this._readMapData(mx, my, 2);
        const tileId3 = this._readMapData(mx, my, 3);
        const shadowBits = this._readMapData(mx, my, 4);
        const upperTileId1 = this._readMapData(mx, my - 1, 1);
        this._addSpotTile(tileId0, dx, dy);
        this._addSpotTile(tileId1, dx, dy);
        this._addShadow(this._lowerLayer, shadowBits, dx, dy);
        if (this._isTableTile(upperTileId1) && !this._isTableTile(tileId1)) {
            if (!Tilemap.isShadowingTile(tileId0)) {
                this._addTableEdge(this._lowerLayer, upperTileId1, dx, dy);
            }
        }
        if (this._isOverpassPosition(mx, my)) {
            this._addTile(this._upperLayer, tileId2, dx, dy);
            this._addTile(this._upperLayer, tileId3, dx, dy);
        } else {
            this._addSpotTile(tileId2, dx, dy);
            this._addSpotTile(tileId3, dx, dy);
        }
    };
    Tilemap.prototype._sortChildren = function () {
        this.children.sort(this.sortHandler);
    };
    Tilemap.warterFrame = [0, 1, 2, 1];
    Tilemap.prototype._addAutotile = function (layer, tileId, dx, dy) {
        const kind = Tilemap.getAutotileKind(tileId);
        const shape = Tilemap.getAutotileShape(tileId);
        const tx = kind % 8;
        const ty = (kind / 8) >> 0;
        let setNumber = 0;
        let bx = 0;
        let by = 0;
        let autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
        let isTable = false;
        if (Tilemap.isTileA1(tileId)) {
            const waterSurfaceIndex = Tilemap.warterFrame[this.animationFrame % 4];
            setNumber = 0;
            if (kind === 0) {
                bx = waterSurfaceIndex * 2;
                by = 0;
            } else if (kind === 1) {
                bx = waterSurfaceIndex * 2;
                by = 3;
            } else if (kind === 2) {
                bx = 6;
                by = 0;
            } else if (kind === 3) {
                bx = 6;
                by = 3;
            } else {
                bx = Math.floor(tx / 4) * 8;
                by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
                if (kind % 2 === 0) {
                    bx += waterSurfaceIndex * 2;
                } else {
                    bx += 6;
                    autotileTable = Tilemap.WATERFALL_AUTOTILE_TABLE;
                    by += this.animationFrame % 3;
                }
            }
        } else if (Tilemap.isTileA2(tileId)) {
            setNumber = 1;
            bx = tx * 2;
            by = (ty - 2) * 3;
            isTable = this._isTableTile(tileId);
        } else if (Tilemap.isTileA3(tileId)) {
            setNumber = 2;
            bx = tx * 2;
            by = (ty - 6) * 2;
            autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
        } else if (Tilemap.isTileA4(tileId)) {
            setNumber = 3;
            bx = tx * 2;
            by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
            if (ty % 2 === 1) {
                autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
            }
        }
        const table = autotileTable[shape];
        const w1 = 24;
        const h1 = 24;
        for (let i = 0; i < 4; i++) {
            const qsx = table[i][0];
            const qsy = table[i][1];
            const sx1 = (bx * 2 + qsx) * w1;
            const sy1 = (by * 2 + qsy) * h1;
            const dx1 = dx + (i % 2) * w1;
            const dy1 = dy + Math.floor(i / 2) * h1;
            if (isTable && (qsy === 1 || qsy === 5)) {
                const qsx2 = qsy === 1 ? (4 - qsx) % 4 : qsx;
                const qsy2 = 3;
                const sx2 = (bx * 2 + qsx2) * w1;
                const sy2 = (by * 2 + qsy2) * h1;
                layer.addRect(setNumber, sx2, sy2, dx1, dy1, w1, h1);
                layer.addRect(setNumber, sx1, sy1, dx1, dy1 + h1 / 2, w1, h1 / 2);
            } else {
                layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, h1);
            }
        }
    };
    Tilemap.prototype._addShadow = function (layer, shadowBits, dx, dy) {
        if (shadowBits & 0x0f) {
            const w1 = 24;
            const h1 = 24;
            for (let i = 0; i < 4; i++) {
                if (shadowBits & (1 << i)) {
                    const dx1 = dx + (i % 2) * w1;
                    const dy1 = dy + Math.floor(i / 2) * h1;
                    layer.addRect(-1, 0, 0, dx1, dy1, w1, h1);
                }
            }
        }
    };
    Tilemap.prototype._addTableEdge = function (layer, tileId, dx, dy) {
        if (Tilemap.isTileA2(tileId)) {
            const autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
            const kind = Tilemap.getAutotileKind(tileId);
            const shape = Tilemap.getAutotileShape(tileId);
            const tx = kind % 8;
            const ty = (kind / 8) >> 0;
            const setNumber = 1;
            const bx = tx * 2;
            const by = (ty - 2) * 3;
            const table = autotileTable[shape];
            const w1 = 24;
            const h1 = 24;
            for (let i = 0; i < 2; i++) {
                const qsx = table[2 + i][0];
                const qsy = table[2 + i][1];
                const sx1 = (bx * 2 + qsx) * w1;
                const sy1 = (by * 2 + qsy) * h1 + h1 / 2;
                const dx1 = dx + (i % 2) * w1;
                const dy1 = dy + Math.floor(i / 2) * h1;
                layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, h1 / 2);
            }
        }
    };
    Tilemap.prototype._addSpot = function (startX, startY, x, y) {
        const mx = startX + x;
        const my = startY + y;
        const dx = x * 48;
        const dy = y * 48;
        const tileId0 = this._readMapData(mx, my, 0);
        const tileId1 = this._readMapData(mx, my, 1);
        const tileId2 = this._readMapData(mx, my, 2);
        const tileId3 = this._readMapData(mx, my, 3);
        const shadowBits = this._readMapData(mx, my, 4);
        const upperTileId1 = this._readMapData(mx, my - 1, 1);
        this._addSpotTile(tileId0, dx, dy);
        this._addSpotTile(tileId1, dx, dy);
        this._addShadow(this._lowerLayer, shadowBits, dx, dy);
        if (this._isTableTile(upperTileId1) && !this._isTableTile(tileId1)) {
            if (!Tilemap.isShadowingTile(tileId0)) {
                this._addTableEdge(this._lowerLayer, upperTileId1, dx, dy);
            }
        }
        if (this._isOverpassPosition(mx, my)) {
            this._addTile(this._upperLayer, tileId2, dx, dy);
            this._addTile(this._upperLayer, tileId3, dx, dy);
        } else {
            this._addSpotTile(tileId2, dx, dy);
            this._addSpotTile(tileId3, dx, dy);
        }
    };
    Tilemap.prototype._addAllSpots = function (startX, startY) {
        this._lowerLayer.clear();
        this._upperLayer.clear();
        const widthWithMatgin = this._width + 40;
        const heightWithMatgin = this._height + 40;
        const tileCols = Math.ceil(widthWithMatgin / 48) + 1;
        const tileRows = Math.ceil(heightWithMatgin / 48) + 1;
        for (let y = 0; y < tileRows; y++) {
            for (let x = 0; x < tileCols; x++) {
                this._addSpot(startX, startY, x, y);
            }
        }
    };
    Tilemap.CombinedLayer.prototype.render = function (renderer) {
        this.updateTransform();
        const children = this.children;
        for (let i2 = 0, j2 = children.length; i2 < j2; ++i2) {
            children[i2].render(renderer);
        }
    };
    Tilemap.CombinedLayer.prototype.size = function () {
        let size = 0;
        this.children.forEach((child) => {
            size += child.size();
        });
        return size;
    };
    WindowLayer.prototype.initialize = function () {
        this.windowPool = new Set();
        this.otherChildren = new Set();
    };
    WindowLayer.prototype.render = function (renderer) {
        this.updateTransform();
        const gl = renderer.gl;
        renderer.framebuffer.forceStencil();
        renderer.batch.flush();
        gl.enable(gl.STENCIL_TEST);
        this.windowPool.forEach((win) => {
            if (win.visible && win.openness > 0) {
                gl.stencilFunc(gl.EQUAL, 0, ~0);
                gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                win.render(renderer);
                renderer.batch.flush();
            }
        });
        gl.disable(gl.STENCIL_TEST);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.clearStencil(0);
        renderer.batch.flush();
        this.otherChildren.forEach((child) => {
            child.render(renderer);
        });
    };
    WindowLayer.prototype.addChild = function (...children) {
        for (const child of children) {
            const pool = child._isWindow ? this.windowPool : this.otherChildren;
            pool.add(child);
        }
        PIXI.Container.prototype.addChild.apply(this, children);
    };
    WindowLayer.prototype.removeChild = function (...children) {
        for (const child of children) {
            const pool = child._isWindow ? this.windowPool : this.otherChildren;
            pool.delete(child);
        }
        PIXI.Container.prototype.removeChild.apply(this, children);
    };
    WindowLayer.prototype.destroy = function (options) {
        this.windowPool.clear();
        this.otherChildren.clear();
        PIXI.Container.prototype.destroy.call(this, options);
    };
    class TileRect extends Array {
        initialize(tileNumber, sx, sy, dx, dy, w, h) {
            this[0] = tileNumber;
            this[1] = sx;
            this[2] = sy;
            this[3] = dx;
            this[4] = dy;
            this[5] = w;
            this[6] = h;
        }
        reset() {
            this[0] = 0;
            this[1] = 0;
            this[2] = 0;
            this[3] = 0;
            this[4] = 0;
            this[5] = 0;
            this[6] = 0;
        }
    }
    Tilemap.Layer.prototype.initialize = function () {
        if (this._elements === void 0) {
            this._elements = [];
        }
        this._indexBuffer = null;
        this._indexArray = new Float32Array(0);
        this._vertexBuffer = null;
        this._vertexArray = new Float32Array(0);
        this._vao = null;
        this._needsTexturesUpdate = false;
        this._needsVertexUpdate = false;
        if (this._images === void 0) {
            this._images = [];
        }
        if (this._state === void 0) {
            this._state = PIXI.State.for2d();
        }
        this._createVao();
    };
    Tilemap.Layer.prototype.destroy = function () {
        if (this._vao) {
            BIGPOOL.return(this._vao);
            this._vao = null;
            this._indexBuffer = null;
            this._vertexBuffer = null;
        }
        this.clear();
        PIXI.Container.prototype.destroy.call(this, DESTROY_OPTIONS);
    }
    Tilemap.Layer.prototype._createVao = function () {
        const ib = BIGPOOL.get(PIXI.Buffer);
        ib.initialize(null, true, true);
        const vb = BIGPOOL.get(PIXI.Buffer);
        vb.initialize(null, true, false);
        const stride = Tilemap.Layer.VERTEX_STRIDE;
        const type = PIXI.TYPES.FLOAT;
        const geometry = BIGPOOL.get(PIXI.Geometry);
        geometry.initialize([]);
        this._indexBuffer = ib;
        this._vertexBuffer = vb;
        this._vao = geometry
            .addIndex(ib)
            .addAttribute("aTextureId", vb, 1, false, type, stride, 0)
            .addAttribute("aFrame", vb, 4, false, type, stride, 1 * 4)
            .addAttribute("aSource", vb, 2, false, type, stride, 5 * 4)
            .addAttribute("aDest", vb, 2, false, type, stride, 7 * 4);
    }
    Tilemap.Layer.prototype.addRect = function (setNumber, sx, sy, dx, dy, w, h) {
        const tileRect = BIGPOOL.get(TileRect);
        tileRect.initialize(setNumber, sx, sy, dx, dy, w, h);
        this._elements.push(tileRect);
    };
    Tilemap.Layer.prototype.clear = function () {
        this._elements.forEach((tileRect) => BIGPOOL.return(tileRect));
        this._elements.length = 0;
        this._needsVertexUpdate = true;
    };
    Tilemap.Layer.prototype._updateVertexBuffer = function () {
        const elements = this._elements;
        const numElements = elements.length;
        const required = numElements * Tilemap.Layer.VERTEX_STRIDE;
        if (this._vertexArray.length < required) {
            this._vertexArray = new Float32Array(required * 2);
        }
        const vertexArray = this._vertexArray;
        let index = 0;
        for (let i = 0; i < numElements; i++) {
            const item = elements[i];
            const setNumber = item[0];
            const tid = setNumber >> 2;
            const sxOffset = 1024 * (setNumber & 1);
            const syOffset = 1024 * ((setNumber >> 1) & 1);
            const sx = item[1] + sxOffset;
            const sy = item[2] + syOffset;
            const dx = item[3];
            const dy = item[4];
            const w = item[5];
            const h = item[6];
            const frameLeft = sx + 0.5;
            const frameTop = sy + 0.5;
            const frameRight = sx + w - 0.5;
            const frameBottom = sy + h - 0.5;
            vertexArray[index++] = tid;
            vertexArray[index++] = frameLeft;
            vertexArray[index++] = frameTop;
            vertexArray[index++] = frameRight;
            vertexArray[index++] = frameBottom;
            vertexArray[index++] = sx;
            vertexArray[index++] = sy;
            vertexArray[index++] = dx;
            vertexArray[index++] = dy;
            vertexArray[index++] = tid;
            vertexArray[index++] = frameLeft;
            vertexArray[index++] = frameTop;
            vertexArray[index++] = frameRight;
            vertexArray[index++] = frameBottom;
            vertexArray[index++] = sx + w;
            vertexArray[index++] = sy;
            vertexArray[index++] = dx + w;
            vertexArray[index++] = dy;
            vertexArray[index++] = tid;
            vertexArray[index++] = frameLeft;
            vertexArray[index++] = frameTop;
            vertexArray[index++] = frameRight;
            vertexArray[index++] = frameBottom;
            vertexArray[index++] = sx + w;
            vertexArray[index++] = sy + h;
            vertexArray[index++] = dx + w;
            vertexArray[index++] = dy + h;
            vertexArray[index++] = tid;
            vertexArray[index++] = frameLeft;
            vertexArray[index++] = frameTop;
            vertexArray[index++] = frameRight;
            vertexArray[index++] = frameBottom;
            vertexArray[index++] = sx;
            vertexArray[index++] = sy + h;
            vertexArray[index++] = dx;
            vertexArray[index++] = dy + h;
        }
        this._vertexBuffer.update(vertexArray);
    };
    Tilemap.Renderer.prototype._createInternalTextures = function () {
        this._destroyInternalTextures();
        for (let i = 0; i < Tilemap.Layer.MAX_GL_TEXTURES; i++) {
            this._internalTextures.push(RENDERTEXTURE_POOL.getBaseRenderTexture(2048, 2048, 1));
        }
    }
    Tilemap.Renderer.prototype._destroyInternalTextures = function () {
        if (this._internalTextures === void 0) {
            this._internalTextures = [];
        }
        for (const internalTexture of this._internalTextures) {
            RENDERTEXTURE_POOL.returnBaseRenderTexture(internalTexture);
        }
        this._internalTextures.length = 0;
    };
    Graphics.initialize = function () {
        this._width = 0;
        this._height = 0;
        this._defaultScale = 1;
        this._realScale = 1;
        this._errorPrinter = null;
        this._tickHandler = null;
        this._canvas = null;
        this._fpsCounter = null;
        this._loadingSpinner = null;
        this._stretchEnabled = this._defaultStretchMode();
        this._effekseer = null;
        this._wasLoading = false;
        this.frameCount = 0;
        this._deltaTime = 0;
        this._deltaMs = 0;
        this.boxWidth = this._width;
        this.boxHeight = this._height;
        this.requestId = 0;
        this._stage = null;
        this.updateHandler = this.update.bind(this);
        this.lastTime = 0;
        this._updateRealScale();
        this._createAllElements();
        this._disableContextMenu();
        this._setupEventHandlers();
        this._createPixiApp();
        this._createEffekseerContext();
        return true;
    };
    Reflect.defineProperty(Graphics, "app", {
        get() {
            console.warn("Deprecated! app has been removed");
            return null;
        },
    });
    Reflect.defineProperty(Graphics, "stage", {
        get() {
            return this._stage;
        },
    });
    Graphics.resize = function (width, height) {
        this._width = width;
        this._height = height;
        this.renderer.resize(width, height);
        this._updateAllElements();
    };
    Graphics.startGameLoop = function () {
        this.update();
    };
    Graphics.FPSCounter.prototype.endTick = function (deltaTime, change) {
        this.fps = (1000 / deltaTime) >> 0;
        this.duration = change >> 0;
        if (this._tickCount++ % 30 === 0) {
            this._update();
        }
    };
    Graphics.FPSCounter.prototype._update = function () {
        const count = this._showFps ? this.fps : this.duration;
        this._labelDiv.textContent = this._showFps ? "FPS" : "ms";
        this._numberDiv.textContent = count >> 0;
    };
    function getInternal(targetFps) {
        switch (targetFps) {
            case 30: {
                return 30;
            }
            case 60: {
                return 15;
            }
            case 90: {
                return 10;
            }
            case 120: {
                return 5;
            }
            default:
                return 15;
        }
    }
    const INTERNAL = getInternal(maxFps);
    Graphics.update = function () {
        const current = performance.now();
        const deltaTime = current - this.lastTime;
        this.lastTime = current;
        this._deltaTime = Math.max(deltaTime, this._deltaTime);
        if (this._deltaTime >= INTERNAL) {
            this._deltaMs = this._deltaTime / 1000;
            this._tickHandler(this._deltaTime);
            if (this._stage !== null) this.objectRender.renderScene(this._stage);
            const now = performance.now();
            const change = now - current;
            this._fpsCounter.endTick(this._deltaTime, change);
            this._deltaTime = this._deltaTime % INTERNAL;
        } else {
            this._deltaTime += deltaTime;
        }
        this.requestId = requestAnimationFrame(this.updateHandler);
    };
    Graphics.stopGameLoop = function () {
        cancelAnimationFrame(this.requestId);
    };
    Graphics._createPixiApp = function () {
        try {
            const renderer = PIXI.autoDetectRenderer({
                view: this._canvas,
                powerPreference: "high-performance",
                backGround: "#000000",
                hello: true,
            });
            this.objectRender = renderer.objectRenderer;
            this.renderer = renderer;
        } catch (e) {
            console.error(e);
        }
    };
    Graphics._createEffekseerContext = function () {
        if (this.renderer && globalThis.effekseer) {
            try {
                this._effekseer = effekseer.createContext();
                if (this._effekseer) {
                    this._effekseer.init(this.renderer.gl);
                    this._effekseer.setRestorationOfStatesFlag(false);
                }
            } catch (e) {
                console.error(e);
            }
        }
    };
    Graphics.setStage = function (stage) {
        this._stage = stage;
    };

    ImageManager.loadCount = 0;
    ImageManager.isReady = function () {
        return this.loadCount === 0;
    };
    ImageManager.clear = function () {
        const cache = this._cache;
        for (const url in cache) {
            BIGPOOL.return(cache[url]);
            Reflect.deleteProperty(cache, url);
        }
    };
    Bitmap.prototype.initialize = function (width, height) {
        this._canvas = null;
        this._context = null;
        this._baseTexture = null;
        this._image = null;
        this._url = "";
        this._paintOpacity = 255;
        this._smooth = true;
        if (this._loadListeners === void 0) {
            this._loadListeners = [];
        }
        this._loadingState = "none";
        if (width > 0 && height > 0) {
            this._createCanvas(width, height);
        }
        this.fontFace = "sans-serif";
        this.fontSize = 16;
        this.fontBold = false;
        this.fontItalic = false;
        this.textColor = "#ffffff";
        this.outlineColor = "rgba(0, 0, 0, 0.5)";
        this.outlineWidth = 3;
    };
    Bitmap.load = function (url) {
        const bitmap = BIGPOOL.get(Bitmap);
        bitmap._url = url;
        bitmap._startLoading();
        ImageManager.loadCount++;
        return bitmap;
    };
    Bitmap.prototype.resize = function (width, height) {
        width = Math.max(width || 0, 1);
        height = Math.max(height || 0, 1);
        this._baseTexture.resize(width, height);
    };
    Bitmap.prototype._createBaseTexture = function (source) {
        const baseTexture = BIGPOOL.get(PIXI.BaseTexture);
        const resource = BIGPOOL.get(ImageResource);
        resource.initialize(source);
        baseTexture.initialize(resource);
        this._baseTexture = baseTexture;
        this._updateScaleMode();
    };
    Bitmap.prototype._ensureCanvas = function () {

    }
    Bitmap.prototype._createCanvas = function (width, height) {
        const { canvas, context } = CANVASPOOL.get(width, height);
        this._canvas = canvas;
        this._context = context;
        this._createBaseTexture(this._canvas);
    };
    Bitmap.prototype._destroyCanvas = function () {
        if (this._canvas) {
            CANVASPOOL.return({ canvas: this._canvas, context: this._context });
            this._canvas = null;
            this._context = null;
            this.useCanvas = false;
        }
    };

    Bitmap.prototype.reset = function () {
        if (this._baseTexture) {
            BIGPOOL.return(this._baseTexture);
            this._baseTexture = null;
        }
        if (this._canvas) {
            CANVASPOOL.return({ canvas: this.canvas, context: this._context });
            this._canvas = null;
            this._context = null;
        }
        if (this._image) this._image = null;
        this._loadingState = "none";
        this._loadListeners.length = 0;
    };
    Bitmap.prototype.destroy = Bitmap.prototype.reset;
    Bitmap.prototype._onLoad = function () {
        if (Utils.hasEncryptedImages()) {
            URL.revokeObjectURL(this._image.src);
        }
        this._loadingState = "loaded";
        this._createBaseTexture(this._image);
        this._callLoadListeners();
        ImageManager.loadCount--;
    };
    Bitmap.prototype._onError = function () {
        Graphics.printError(
            "Image Error!",
            "Load Image occured an Error! \nURL is " + this._url
        );
        Graphics.showRetryButton(() => {
            this.retry();
            SceneManager.resume();
        });
    };
    DataManager.onLoad = function (object) {
        if (Reflect.has(object, "data") && Reflect.has(object, "events")) {
            this.extractMetadata(object);
            this.extractArrayMetadata(object.events);
        } else {
            this.extractArrayMetadata(object);
        }
    };
    JsonEx._encode = function (value, depth) {
        if (depth >= this.maxDepth) throw new Error("Object too deep");
        const type = Object.prototype.toString.call(value);
        if (type === "[object Object]" || type === "[object Array]") {
            if (Reflect.getPrototypeOf(value) !== null) {
                const constructorName = value.constructor.name;
                if (constructorName !== "Object" && constructorName !== "Array")
                    value["@"] = constructorName;
            }
            for (const key of Reflect.ownKeys(value)) {
                value[key] = this._encode(value[key], depth + 1);
            }
        }
        return value;
    };
    Spriteset_Base.prototype.createOverallFilters = function () {
        this.filters = [];
        const colorFilter = BIGPOOL.get(ColorFilter);
        this._overallColorFilter = colorFilter;
        this._boundsRect = BIGPOOL.get(Rectangle);
        this.addFilter(colorFilter);
    };
    Spriteset_Base.prototype.createBaseFilters = function () {
        const colorFilter = BIGPOOL.get(ColorFilter);
        this._baseColorFilter = colorFilter;
        this._baseSprite._boundsRect = BIGPOOL.get(Rectangle);
        this._baseSprite.addFilter(colorFilter);
    };
    Spriteset_Base.prototype.createPictures = function () {
        this._pictureContainer = new PIXI.Container();
        for (let i = 1; i <= $gameScreen.maxPictures(); i++) {
            this._pictureContainer.addChild(new Sprite_Picture(i));
        }
        this.addChild(this._pictureContainer);
    };
    Spriteset_Base.prototype.createBaseSprite = function () {
        this._baseSprite = new PIXI.Container();
        this.addChild(this._baseSprite);
    };
    Spriteset_Map.prototype.createShadow = function () {
        const sprite = (this._shadowSprite = new Sprite(
            ImageManager.loadSystem("Shadow1")
        ));
        sprite._anchor.set(0.5, 1);
        sprite.z = 6;
        this._tilemap.addChild(sprite);
    };
    Spriteset_Battle.prototype.createBackground = function () {
        this._backgroundSprite = new BackBlurSprite(SceneManager.snapTexture);
        this._backgroundSprite.addFilter(BIGPOOL.get(PIXI.AlphaFilter));
        this._baseSprite.addChild(this._backgroundSprite);
    }
    Sprite_Damage.prototype.createBitmap = function (width, height) {
        const bitmap = new Bitmap(width, height);
        bitmap.fontFace = this.fontFace();
        bitmap.fontSize = this.fontSize();
        bitmap.textColor = this.damageColor();
        bitmap.outlineColor = this.outlineColor();
        bitmap.outlineWidth = this.outlineWidth();
        return bitmap;
    }
    Sprite_Damage.prototype.render = function (renderer) {
        this._render(renderer);
        if (this._duration > 0) {
            const children = this.children;
            for (let i2 = 0, j2 = children.length; i2 < j2; ++i2) {
                const child = children[i2];
                if (child === void 0) continue;
                if (!child.isMask) child.render(renderer);
                this.updateChild(child);
            }
            this._duration--;
        } else {
            this.remove();
        }
    }
    SceneManager.snapTexture = null;
    SceneManager.snap = function () {
        if (this.snapTexture !== null) {
            RENDERTEXTURE_POOL.returnRenderTexture(this.snapTexture);
            this.snapTexture = null;
        }
        const scene = this._scene;
        const { width, height, renderer } = Graphics;
        const renderTexture = RENDERTEXTURE_POOL.getRenderTexture(width, height, 1);
        renderer.render(scene, renderTexture);
        this.snapTexture = renderTexture;
    };
    SceneManager.snapForBackground = function () {
        this.snap();
    };
    const DESTROY_OPTIONS = { children: true, textrue: true };
    SceneManager.onBeforeSceneStart = function () {
        if (this._previousScene) {
            this._previousScene.destroy(DESTROY_OPTIONS);
            this._previousScene = null;
        }
        if (Graphics.effekseer) {
            Graphics.effekseer.stopAll();
        }
    };
    SceneManager.updateMain = function () {
        try {
            Graphics.frameCount++;
            this.updateInputData();
            this.changeScene();
            this.updateScene();
            Graphics._effekseer.update();
        } catch (e) {
            this.catchException(e);
        }
    };
    SceneManager.goto = function (sceneClass) {
        if (sceneClass) {
            this._nextScene = new sceneClass();
        }
        if (this._scene) {
            this._scene.stop();
        }
    };
    SceneManager.initGraphics = function () {
        if (!Graphics.initialize()) {
            throw new Error("Failed to initialize graphics.");
        }
        Graphics.setTickHandler(this.updateMain.bind(this));
    };
    SceneManager.updateScene = function () {
        if (this._scene) {
            if (this._scene.isStarted()) {
                this._scene.update();
            } else if (this._scene.isReady()) {
                this.onBeforeSceneStart();
                this._scene.start();
                this.onSceneStart();
            }
        }
    };
    DataManager.metaRegexp = /<([^<>:]+)(:?)([^>]*)>/g;
    DataManager.getDataType = function (object) {
        switch (object) {
            case globalThis.$dataArmors: {
                return "isArmor";
            }
            case globalThis.$dataWeapons: {
                return "isWeapon";
            }
            case globalThis.$dataSkills: {
                return "isSkill";
            }
            case globalThis.$dataItems: {
                return "isItem";
            }
            case globalThis.$dataStates: {
                return "isState";
            }
            case globalThis.$dataActors: {
                return "isActor";
            }
            default:
                return "isEvent";
        }
    };
    DataManager.extractArrayMetadata = function (array) {
        if (Array.isArray(array)) {
            const type = this.getDataType(array);
            array.forEach((data, index) => {
                if (index > 0) {
                    if (data !== null) {
                        data.isEmpty = data.name === "";
                        Reflect.set(data, type, true);
                        if (Reflect.has(data, "note")) {
                            this.extractMetadata(data);
                        }
                    }
                }
            });
        }
    };
    DataManager.isSkill = function (item) {
        return item && item.isSkill;
    };
    DataManager.isItem = function (item) {
        return item && item.isItem;
    };
    DataManager.isWeapon = function (item) {
        return item && item.isWeapon;
    };
    DataManager.isArmor = function (item) {
        return item && item.isArmor;
    };
    DataManager.extractMetadata = function (data) {
        const meta = {};
        const regexp = this.metaRegexp;
        for (; ;) {
            const match = regexp.exec(data.note);
            if (match === null) break;
            const [, name, pattern, value] = match;
            meta[name] = pattern === ":" ? value : true;
        }
        data.meta = meta;
    };
    ColorManager.initialize = function () {
        this.colorCache = [
            "#ffffff",
            "#20a0d6",
            "#ff784c",
            "#66cc40",
            "#99ccff",
            "#ccc0ff",
            "#ffffa0",
            "#808080",
            "#c0c0c0",
            "#2080cc",
            "#ff3810",
            "#00a010",
            "#3e9ade",
            "#a098ff",
            "#ffcc20",
            "#000000",
            "#84aaff",
            "#ffff40",
            "#ff2020",
            "#202040",
            "#e08040",
            "#f0c040",
            "#4080c0",
            "#40c0f0",
            "#80ff80",
            "#c08080",
            "#8080ff",
            "#ff80ff",
            "#00a040",
            "#00e060",
            "#a060e0",
            "#c080ff",
        ];
        this._paddingColor = "#34cfff";
        this._outlineColor = "rgba(0, 0, 0, 0.6)";
        this._dimColor1 = "rgba(0, 0, 0, 0.6)";
        this._dimColor2 = "rgba(0, 0, 0, 0)";
        this._itemBackColor1 = "rgba(32, 32, 32, 0.5)";
        this._itemBackColor2 = "rgba(0, 0, 0, 0.5)";
    };
    ColorManager.textColor = function (n) {
        return this.colorCache[n];
    };
    ColorManager.pendingColor = function () {
        return this._paddingColor;
    };
    ColorManager.hpColor = function (actor) {
        if (!actor) {
            return this.normalColor();
        } else if (actor.isDead()) {
            return this.deathColor();
        } else if (actor.isDying()) {
            return this.crisisColor();
        } else {
            return this.normalColor();
        }
    };
    ColorManager.mpColor = function (/*actor*/) {
        return this.normalColor();
    };
    ColorManager.tpColor = function (/*actor*/) {
        return this.normalColor();
    };
    ColorManager.paramchangeTextColor = function (change) {
        if (change > 0) {
            return this.powerUpColor();
        } else if (change < 0) {
            return this.powerDownColor();
        } else {
            return this.normalColor();
        }
    };
    ColorManager.outlineColor = function () {
        return this._outlineColor;
    };
    ColorManager.dimColor1 = function () {
        return this._dimColor1;
    };
    ColorManager.dimColor2 = function () {
        return this._dimColor2;
    };
    ColorManager.itemBackColor1 = function () {
        return this._itemBackColor1;
    };
    ColorManager.itemBackColor2 = function () {
        return this._itemBackColor2;
    };
    ColorManager.initialize();
    Game_BattlerBase.prototype.initMembers = function () {
        this._hp = 1;
        this._mp = 0;
        this._tp = 0;
        this._hidden = false;
        this._states = [];
        this.clearParamPlus();
        this.clearStates();
        this.clearBuffs();
    };
    Game_BattlerBase.prototype.clearStates = function () {
        this._states.length = 0;
        this._stateTurns = {};
    };
    Game_ActionResult.prototype.initialize = function () {
        this.addedStates = [];
        this.removedStates = [];
        this.addedBuffs = [];
        this.addedDebuffs = [];
        this.removedBuffs = [];
        this.clear();
    };
    Game_ActionResult.prototype.clear = function () {
        this.used = false;
        this.missed = false;
        this.evaded = false;
        this.physical = false;
        this.drain = false;
        this.critical = false;
        this.success = false;
        this.hpAffected = false;
        this.hpDamage = 0;
        this.mpDamage = 0;
        this.tpDamage = 0;
        this.addedStates.length = 0;
        this.removedStates.length = 0;
        this.addedBuffs.length = 0;
        this.addedDebuffs.length = 0;
        this.removedBuffs.length = 0;
    };
    Performance.VERSION = "2.12";
    Performance.RenderTexturePool = RenderTexturePool;
    Performance.MultiplyPool = MultiplyPool;
    Performance.CanvasPool = CanvasPool;
    Performance.FilterTexturePool = FilterTexturePool;
    Performance.Window_ClientContainer = Window_ClientContainer;
    Performance.BackBlurSprite = BackBlurSprite;
    Performance.TileRect = TileRect;
    Performance.ImageResource = ImageResource;
    Performance.RENDERTEXTURE_POOL = RENDERTEXTURE_POOL;
    Performance.FILTER_TEXTUREPOOL = FILTER_TEXTUREPOOL;
    Performance.BIGPOOL = BIGPOOL;
    Performance.CANVASPOOL = CANVASPOOL;
    return Performance;
})(Object.create(null));
