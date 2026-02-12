(function(window){

    function random(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function bezier(cp, t) {  
        var p1 = cp[0].mul((1 - t) * (1 - t));
        var p2 = cp[1].mul(2 * t * (1 - t));
        var p3 = cp[2].mul(t * t); 
        return p1.add(p2).add(p3);
    }  

    function inheart(x, y, r) {
        var z = ((x / r) * (x / r) + (y / r) * (y / r) - 1) ** 3 - (x / r) * (x / r) * (y / r) ** 3;
        return z < 0;
    }

    Point = function(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    Point.prototype = {
        clone: function() { return new Point(this.x, this.y); },
        add: function(o) { var p=this.clone(); p.x+=o.x; p.y+=o.y; return p; },
        sub: function(o) { var p=this.clone(); p.x-=o.x; p.y-=o.y; return p; },
        div: function(n) { var p=this.clone(); p.x/=n; p.y/=n; return p; },
        mul: function(n) { var p=this.clone(); p.x*=n; p.y*=n; return p; }
    }

    Heart = function() {
        var points = [], x, y, t;
        for (var i = 10; i < 30; i += 0.2) {
            t = i / Math.PI;
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            points.push(new Point(x, y));
        }
        this.points = points;
        this.length = points.length;
    }
    Heart.prototype = {
        get: function(i, scale) { return this.points[i].mul(scale || 1); }
    }

    Seed = function(tree, point, scale, color) {
        this.tree = tree;
        this.heart = { point: point, scale: scale||1, color: color||"#FF0000", figure: new Heart() };
        this.cirle = { point: point, scale: scale||1, color: color||"#FF0000", radius: 5 };
    }
    Seed.prototype = {
        draw: function() { this.drawHeart(); this.drawText(); },
        addPosition: function(x,y) { this.cirle.point = this.cirle.point.add(new Point(x,y)); },
        canMove: function() { return this.cirle.point.y < (this.tree.height + 20); },
        move: function(x,y) { this.clear(); this.drawCirle(); this.addPosition(x,y); },
        canScale: function() { return this.heart.scale > 0.2; },
        setHeartScale: function(scale) { this.heart.scale *= scale; },
        scale: function(scale) { this.clear(); this.drawCirle(); this.drawHeart(); this.setHeartScale(scale); },
        drawHeart: function() {
            var ctx=this.tree.ctx, heart=this.heart, p=heart.point, c=heart.color, s=heart.scale;
            ctx.save(); ctx.fillStyle=c; ctx.translate(p.x,p.y); ctx.beginPath();
            ctx.moveTo(0,0);
            for(var i=0;i<heart.figure.length;i++){ var pt=heart.figure.get(i,s); ctx.lineTo(pt.x,-pt.y); }
            ctx.closePath(); ctx.fill(); ctx.restore();
        },
        drawCirle: function() {
            var ctx=this.tree.ctx, c=this.cirle, p=c.point, r=c.radius, s=c.scale;
            ctx.save(); ctx.fillStyle=c.color; ctx.translate(p.x,p.y); ctx.scale(s,s); ctx.beginPath();
            ctx.arc(0,0,r,0,2*Math.PI); ctx.closePath(); ctx.fill(); ctx.restore();
        },
        drawText: function() {},
        clear: function() {
            var ctx=this.tree.ctx, c=this.cirle, p=c.point, s=c.scale, r=26;
            var w = h = r*s;
            ctx.clearRect(p.x-w,p.y-h,4*w,4*h);
        },
        hover: function(x,y) {
            var ctx=this.tree.ctx, p=this.cirle.point;
            var dx = x - p.x, dy = y - p.y;
            return Math.sqrt(dx*dx+dy*dy) < 30; // área de hover
        }
    }

    // --- NUEVA CLASE: Imagenes alrededor del corazón ---
    SeedImage = function(tree, imgSrc, angle, distance) {
        this.tree = tree;
        this.img = new Image();
        this.img.src = imgSrc;
        this.angle = angle;
        this.distance = distance;
        this.alpha = 1;
    }
    SeedImage.prototype.draw = function() {
        var ctx=this.tree.ctx;
        var seedPoint=this.tree.seed.heart.point;
        var x = seedPoint.x + Math.cos(this.angle)*this.distance;
        var y = seedPoint.y + Math.sin(this.angle)*this.distance;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(x,y);
        ctx.drawImage(this.img,-25,-25,50,50);
        ctx.restore();
    }
    SeedImage.prototype.fade = function(speed) { this.alpha-=speed; if(this.alpha<0)this.alpha=0; }

    // --- BLOOM Y BRANCH siguen igual ---
    Bloom = function(tree, point, figure, color, alpha, angle, scale, place, speed) {
        this.tree=tree; this.point=point; this.color=color||'rgb(255,'+random(0,255)+','+random(0,255)+')';
        this.alpha=alpha||random(0.3,1); this.angle=angle||random(0,360); this.scale=scale||0.1; this.place=place; this.speed=speed; this.figure=figure;
    }
    Bloom.prototype = {
        setFigure: function(f){this.figure=f;},
        flower: function(){this.draw(); this.scale+=0.1; if(this.scale>1)this.tree.removeBloom(this);},
        draw: function(){ var ctx=this.tree.ctx,f=this.figure,p=this.point; ctx.save(); ctx.fillStyle=this.color; ctx.globalAlpha=this.alpha; ctx.translate(p.x,p.y); ctx.scale(this.scale,this.scale); ctx.rotate(this.angle); ctx.beginPath(); ctx.moveTo(0,0);
            for(var i=0;i<f.length;i++){ var pt=f.get(i); ctx.lineTo(pt.x,-pt.y); } ctx.closePath(); ctx.fill(); ctx.restore(); },
        jump: function(){ var s=this,h=this.tree.height; if(s.point.x<-20||s.point.y>h+20){ this.tree.removeBloom(this);}else{this.draw(); this.point=this.place.sub(this.point).div(this.speed).add(this.point); this.angle+=0.05; this.speed-=1;}}
    }

    Branch = function(tree, p1,p2,p3,r,len,branchs){
        this.tree=tree; this.point1=p1; this.point2=p2; this.point3=p3; this.radius=r; this.length=len||100; this.len=0; this.t=1/(this.length-1); this.branchs=branchs||[];
    }
    Branch.prototype.grow=function(){ var s=this,p; if(s.len<=s.length){p=bezier([s.point1,s.point2,s.point3],s.len*s.t); s.draw(p); s.len+=1; s.radius*=0.97;} else {s.tree.removeBranch(s); s.tree.addBranchs(s.branchs);} }
    Branch.prototype.draw=function(p){ var ctx=this.tree.ctx; ctx.save(); ctx.beginPath(); ctx.fillStyle='RGB(0,128,128)'; ctx.shadowColor='#22b822'; ctx.shadowBlur=2; ctx.moveTo(p.x,p.y); ctx.arc(p.x,p.y,this.radius,0,2*Math.PI); ctx.closePath(); ctx.fill(); ctx.restore(); }

    // --- TREE ---
    Tree = function(canvas,width,height,opt){
        this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.width=width; this.height=height; this.opt=opt||{};
        this.record={};
        this.initSeed();
        this.initFooter();
        this.initBranch();
        this.initBloom();
        this.initSeedImages();
    }
    Tree.prototype.initSeed=function(){
        var s=this.opt.seed||{};
        var x=s.x||this.width/2; var y=s.y||this.height/2;
        this.seed=new Seed(this,new Point(x,y),s.scale||1,s.color||'#FF0000');
    }
    Tree.prototype.initFooter=function(){
        var f=this.opt.footer||{};
        this.footer=new Footer(this,f.width||this.width,f.height||5,f.speed||2);
    }
    Tree.prototype.initBranch=function(){
        var bs=this.opt.branch||[]; this.branchs=[]; this.addBranchs(bs);
    }
    Tree.prototype.initBloom=function(){
        var b=this.opt.bloom||{}, cache=[], num=b.num||500, width=b.width||this.width, height=b.height||this.height, fig=this.seed.heart.figure;
        var r=240; for(var i=0;i<num;i++){ cache.push(this.createBloom(width,height,r,fig)); }
        this.blooms=[]; this.bloomsCache=cache;
    }
    Tree.prototype.initSeedImages=function(){
        var imgs=["img/1.jpeg","img/2.jpeg","img/3.jpeg","img/4.jpeg","img/5.jpeg","img/6.jpeg","img/7.jpeg","img/8.jpeg"];
        this.seedImages=[];
        for(var i=0;i<imgs.length;i++){
            var angle=(i/imgs.length)*2*Math.PI;
            this.seedImages.push(new SeedImage(this,imgs[i],angle,150));
        }
    }

    Tree.prototype.drawSeedImages=function(){
        for(var i=0;i<this.seedImages.length;i++){ this.seedImages[i].draw(); }
    }

    Tree.prototype.fadeSeedImages=function(speed){
        for(var i=0;i<this.seedImages.length;i++){ this.seedImages[i].fade(speed); }
    }

    // --- EXPORT ---
    window.random=random; window.bezier=bezier; window.Point=Point; window.Tree=Tree;

})(window);
