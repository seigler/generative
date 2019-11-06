document.addEventListener('DOMContentLoaded', function() {
  let path = document.location.pathname.split('/');
  if (path.length > 1) {
    require('./sketches/' + path[path.length - 2]);
  }
});
