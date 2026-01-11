(function () {
    function attach({ container, content, position = 'bottom-left', topOffset, rightOffset, bottomOffset, leftOffset }) {
        const root = d3.select(container);
        if (root.empty()) return;

        // Empêche les doublons
        if (!root.select('.comment-button').empty()) return;

        // Container relatif
        root.style('position', 'relative').style('width', '100%');

        const button = root.append('button')
            .attr('class', 'comment-button')
            .style('position', 'absolute')
            .style('z-index', '20')
            .style('background', '#000000ff')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('padding', '4px 8px')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .text('💬');

        // Position par défaut : bas gauche
        switch(position) {
            case 'top-right':
                button.style('top', (topOffset !== undefined ? topOffset : 8) + 'px')
                      .style('right', (rightOffset !== undefined ? rightOffset : 8) + 'px');
                break;
            case 'top-left':
                button.style('top', (topOffset !== undefined ? topOffset : 8) + 'px')
                      .style('left', (leftOffset !== undefined ? leftOffset : 8) + 'px');
                break;
            case 'bottom-right':
                button.style('bottom', (bottomOffset !== undefined ? bottomOffset : 8) + 'px')
                      .style('right', (rightOffset !== undefined ? rightOffset : 8) + 'px');
                break;
            default: // 'bottom-left'
                button.style('bottom', (bottomOffset !== undefined ? bottomOffset : 8) + 'px')
                      .style('left', (leftOffset !== undefined ? leftOffset : 8) + 'px');
        }

        const box = root.append('div')
            .attr('class', 'comment-box')
            .style('position', 'absolute')
            .style('z-index', '20')
            .style('background', 'white')
            .style('border', '1px solid #cbd5e1')
            .style('border-radius', '6px')
            .style('padding', '10px')
            .style('width', '260px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
            .style('font-size', '12px')
            .style('display', 'none')
            .html(content);

        // Position de la box juste sous le bouton
        if(position.startsWith('top')) {
            box.style('top', (topOffset !== undefined ? topOffset + 28 : 36) + 'px')
               .style('left', button.style('left') || 'auto')
               .style('right', button.style('right') || 'auto');
        } else { // bottom
            box.style('bottom', (bottomOffset !== undefined ? bottomOffset + 28 : 36) + 'px')
               .style('left', button.style('left') || 'auto')
               .style('right', button.style('right') || 'auto');
        }

        button.on('click', () => {
            box.style('display', box.style('display') === 'none' ? 'block' : 'none');
        });
    }

    window.CommentButton = { attach };
})();
