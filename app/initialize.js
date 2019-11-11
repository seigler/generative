document.addEventListener('DOMContentLoaded', function() {
  let path = document.location.pathname.split('/');
  if (path.length > 1) {
    require(`${path[path.length - 2]}/index`);
  }
});
