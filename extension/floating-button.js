// Logic for the draggable floating AI button
const floatingButton = {
  el: null,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initialX: 0,
  initialY: 0,

  async init(onClick) {
    if (document.getElementById('xposter-ai-button')) return;

    this.el = document.createElement('div');
    this.el.id = 'xposter-ai-button';
    this.el.innerHTML = '🤖';
    this.el.title = 'XPoster AI Copilot';
    
    // Position
    const pos = await storage.get('button_pos') || { right: 20, bottom: 20 };
    this.el.style.right = `${pos.right}px`;
    this.el.style.bottom = `${pos.bottom}px`;
    
    document.body.appendChild(this.el);

    this.el.addEventListener('mousedown', (e) => this.startDrag(e));
    this.el.addEventListener('click', (e) => {
      if (this.isDragging) return;
      onClick();
    });

    window.addEventListener('mousemove', (e) => this.drag(e));
    window.addEventListener('mouseup', () => this.stopDrag());
  },

  startDrag(e) {
    this.isDragging = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    const rect = this.el.getBoundingClientRect();
    this.initialX = window.innerWidth - rect.right;
    this.initialY = window.innerHeight - rect.bottom;
  },

  drag(e) {
    if (this.dragStartX === 0) return;
    
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this.isDragging = true;
      const newRight = this.initialX - dx;
      const newBottom = this.initialY - dy;
      
      this.el.style.right = `${newRight}px`;
      this.el.style.bottom = `${newBottom}px`;
    }
  },

  async stopDrag() {
    if (this.isDragging) {
      const rect = this.el.getBoundingClientRect();
      const pos = {
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.bottom
      };
      await storage.set('button_pos', pos);
    }
    this.dragStartX = 0;
    this.dragStartY = 0;
  }
};
