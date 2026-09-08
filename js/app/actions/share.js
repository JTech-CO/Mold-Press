(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.share = function (props) {
    this.share = () => {
      const epoch = this.workspaceEpoch;
      this.setState({ modal: 'share', shareLink: '', shareError: '', shareBusy: true });
      (async () => {
        try {
          const id = M.uid(),
            raw = await M.compress(JSON.stringify(this.state.p));
          if (!this.alive || epoch !== this.workspaceEpoch) return;
          localStorage.setItem('mold-press.share.' + id, raw);
          let shares;
          try {
            shares = JSON.parse(localStorage.getItem('mold-press.shares') || '[]');
          } catch {
            shares = [];
          }
          if (!Array.isArray(shares)) shares = [];
          shares.push(id);
          while (shares.length > 5) localStorage.removeItem('mold-press.share.' + shares.shift());
          localStorage.setItem('mold-press.shares', JSON.stringify(shares));
          if (this.alive)
            this.setState({
              shareLink: location.href.split('#')[0] + '#copy=' + encodeURIComponent(id),
              shareBusy: false
            });
        } catch (e) {
          if (this.alive && epoch === this.workspaceEpoch)
            this.setState({
              shareBusy: false,
              shareError: this.t(
                '이 미리보기에서는 브라우저 저장소를 사용할 수 없어 복제 링크를 만들지 못했습니다. 아래 JSON·PNG 내보내기는 사용할 수 있습니다.',
                'Storage is unavailable in this preview, so a clone link cannot be created. JSON/PNG exports below remain available.'
              )
            });
        }
      })();
    };
    this.copyLink = async () => {
      try {
        await navigator.clipboard.writeText(this.state.shareLink);
        this.notice(this.t('링크를 복사했습니다.', 'Link copied.'));
      } catch {
        const input = document.getElementById('share-link');
        input.select();
        const ok = document.execCommand('copy');
        this.notice(
          this.t(
            ok ? '링크를 복사했습니다.' : '선택된 링크를 Ctrl+C로 복사하세요.',
            ok ? 'Link copied.' : 'Press Ctrl+C to copy the selected link.'
          )
        );
      }
    };
  };
})(window.MP);
