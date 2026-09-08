(function (M) {
  'use strict';

  const R = React,
    V = M.V;
  R.Fragment =
    R.Fragment ||
    function Fragment({ children }) {
      return children || null;
    };
  const createRef = () => {
    const ref = (value) => (ref.current = value);
    ref.current = null;
    return ref;
  };
  const icons = {
    box: 'M4 7 12 3 20 7 20 17 12 21 4 17Z M4 7 12 11 20 7 M12 11V21',
    cylinder: 'M5 6C5 2 19 2 19 6V18C19 22 5 22 5 18Z M5 6C5 10 19 10 19 6',
    sphere: 'M21 12A9 9 0 1 1 3 12A9 9 0 1 1 21 12 M3 12H21 M12 3C5 7 5 17 12 21C19 17 19 7 12 3',
    cone: 'M12 3 3 19C7 23 17 23 21 19Z',
    torus: 'M21 12A9 7 0 1 1 3 12A9 7 0 1 1 21 12 M16 12A4 2.5 0 1 1 8 12A4 2.5 0 1 1 16 12',
    text: 'M4 5H20 M12 5V21 M8 21H16 M4 5V9 M20 5V9',
    move: 'M12 2V22 M2 12H22 M8 6 12 2 16 6 M8 18 12 22 16 18 M6 8 2 12 6 16 M18 8 22 12 18 16',
    rotate: 'M20 7A9 9 0 1 0 21 15 M20 2V7H15',
    scale: 'M4 14V21H11 M14 3H21V10 M21 3 4 21',
    pointer: 'M5 3 19 13 12 15 9 22Z',
    copy: 'M9 3H21V15H17 M3 9H15V21H3Z',
    mirror: 'M12 2V22 M8 6 3 18H8Z M16 6 21 18H16Z',
    align: 'M12 2V22 M4 5H20V10H4Z M7 14H17V19H7Z',
    group: 'M8 3H3V8 M16 3H21V8 M3 16V21H8 M16 21H21V16 M7 7H17V17H7Z',
    union: 'M3 3H14V9H21V21H9V14H3Z',
    subtract: 'M3 3H17V8H9V17H3Z M13 12H21V21H13Z',
    intersect: 'M3 3H15V15H3Z M9 9H21V21H9Z',
    round: 'M4 20V12C4 6 6 4 12 4H20 M9 20V14C9 11 11 9 14 9H20',
    chamfer: 'M4 20V11L11 4H20 M9 20V14L14 9H20',
    split: 'M4 3V8H20V3 M4 21V16H20V21 M2 12H22',
    undo: 'M9 4 3 10 9 16 M3 10H15C22 10 22 21 15 21',
    redo: 'M15 4 21 10 15 16 M21 10H9C2 10 2 21 9 21',
    upload: 'M12 16V3 M7 8 12 3 17 8 M3 14V21H21V14',
    download: 'M12 3V16 M7 11 12 16 17 11 M3 17V21H21V17',
    share:
      'M8 12 17 6 M8 12 17 18 M7 12A2 2 0 1 0 3 12A2 2 0 1 0 7 12 M21 5A2 2 0 1 0 17 5A2 2 0 1 0 21 5 M21 19A2 2 0 1 0 17 19A2 2 0 1 0 21 19',
    eye: 'M2 12Q12 0 22 12Q12 24 2 12Z M15 12A3 3 0 1 1 9 12A3 3 0 1 1 15 12',
    trash: 'M3 6H21 M8 6V3H16V6 M6 6 7 21H17L18 6 M10 10V17 M14 10V17',
    grid: 'M3 3H21V21H3Z M9 3V21 M15 3V21 M3 9H21 M3 15H21',
    magnet: 'M5 3V13A7 7 0 0 0 19 13V3H14V13A2 2 0 0 1 10 13V3Z M5 8H10 M14 8H19',
    measure: 'M3 16 16 3 22 9 9 22Z M7 12 10 15 M11 8 14 11 M15 4 18 7',
    fit: 'M3 8V3H8 M16 3H21V8 M3 16V21H8 M16 21H21V16 M8 8H16V16H8Z',
    play: 'M7 3 21 12 7 21Z',
    stop: 'M5 5H19V19H5Z',
    check: 'M4 12 9 17 20 6',
    chevron: 'M8 4 16 12 8 20',
    down: 'M5 9 12 16 19 9',
    plus: 'M12 3V21 M3 12H21',
    close: 'M5 5 19 19 M5 19 19 5',
    tool: 'M3 4H21V9H3Z M6 9V15 M18 9V15 M3 15H21V21H3Z M9 12H15',
    press: 'M3 3H21 M5 3V21 M19 3V21 M3 21H21 M8 7H16V11H8Z M8 15H16V18H8Z',
    assembly: 'M12 2 21 7 12 12 3 7Z M3 12 12 17 21 12 M3 17 12 22 21 17',
    camera: 'M3 7H7L9 4H15L17 7H21V21H3Z M16 13A4 4 0 1 1 8 13A4 4 0 1 1 16 13',
    info: 'M21 12A9 9 0 1 1 3 12A9 9 0 1 1 21 12 M12 10V17 M12 6V7',
    warn: 'M12 3 22 21H2Z M12 9V14 M12 17V18',
    folder: 'M3 6V21H21V8H11L9 4H3Z',
    pin: 'M8 3H16L15 9 19 13H13V22H11V13H5L9 9Z',
    refresh: 'M20 8A9 9 0 0 0 4 7 M4 2V7H9 M4 16A9 9 0 0 0 20 17 M20 22V17H15'
  };
  function Icon({ name = 'box', size = 18 }) {
    return React.createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true'
      },
      React.createElement('path', { d: icons[name] || icons.box })
    );
  }
  function Button({
    children,
    icon,
    onClick,
    active = false,
    primary = false,
    disabled = false,
    title,
    test,
    className = ''
  }) {
    return React.createElement(
      'button',
      {
        type: 'button',
        'data-testid': test,
        title: title,
        disabled: disabled,
        onClick: onClick,
        className: `btn ${active ? 'active' : ''} ${primary ? 'primary' : ''} ${className}`
      },
      icon && React.createElement(Icon, { name: icon }),
      ' ',
      children
    );
  }
  const fmt = (n, d = 1) =>
    Number.isFinite(n)
      ? n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })
      : '-';
  Object.assign(M.UI, { R, createRef, Icon, Button, fmt });
})(window.MP);
