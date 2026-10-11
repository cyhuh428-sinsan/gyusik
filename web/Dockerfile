# 규식이 static site. Build the site first (npx gulp deploy) and put its output in ./site next to this file.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/
# the original RegExr page and its assets are not part of the public site
RUN rm -rf /usr/share/nginx/html/regexr-legacy.html /usr/share/nginx/html/assets
