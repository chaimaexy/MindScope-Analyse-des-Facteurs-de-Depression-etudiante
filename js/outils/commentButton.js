(function () {
    function attach({ container, content }) {
        const root = d3.select(container);
        if (root.empty()) return;

        // Cherche ou crée un overlay
        let overlay = root.select('.chart-overlay');
        if (overlay.empty()) {
            root.style('position', 'relative');

            overlay = root.append('div')
                .attr('class', 'chart-overlay')
                .style('position', 'absolute')
                .style('inset', '0') // top/right/bottom/left = 0
                .style('pointer-events', 'none'); // IMPORTANT
        }

        // Empêcher doublons
        if (!overlay.select('.comment-button').empty()) return;

        const button = overlay.append('button')
            .attr('class', 'comment-button')
            .style('position', 'absolute')
            .style('bottom', '28px')
            .style('left', '8px')
            .style('z-index', '20')
            .style('pointer-events', 'auto')
            .style('background', '#000')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('padding', '4px 8px')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .text('💬');

        const box = overlay.append('div')
            .attr('class', 'comment-box')
            .style('position', 'absolute')
            .style('bottom', '64px')
            .style('left', '8px')
            .style('z-index', '20')
            .style('pointer-events', 'auto')
            .style('background', 'white')
            .style('border', '1px solid #cbd5e1')
            .style('border-radius', '6px')
            .style('padding', '10px')
            .style('width', '260px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
            .style('font-size', '12px')
            .style('display', 'none')
            .html(content);

        button.on('click', () => {
            box.style(
                'display',
                box.style('display') === 'none' ? 'block' : 'none'
            );
        });
    }

    window.CommentButton = { attach };
})();
