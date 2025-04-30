function createSparkles(x, y) {
    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = x + 'px';
        sparkle.style.top = y + 'px';
        sparkle.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
        sparkle.style.transform = `scale(${Math.random()})`;
        document.body.appendChild(sparkle);

        const angle = Math.random() * 360;
        const distance = 100 + Math.random() * 100;

        setTimeout(() => {
            sparkle.style.opacity = 0;
            sparkle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`;
        }, 50);

        setTimeout(() => sparkle.remove(), 1000);
    }
}