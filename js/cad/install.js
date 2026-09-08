(function (M) {
  'use strict';

  M.installCadUI = (app) => {
    M.CadInstallers.state(app);
    M.CadInstallers.sketch(app);
    M.CadInstallers.features(app);
    M.CadInstallers.mates(app);
    M.CadInstallers.keyboard(app);
    M.CadInstallers.navigation(app);
    M.CadInstallers.scene(app);
    M.CadInstallers.views(app);
  };
})(window.MP);
