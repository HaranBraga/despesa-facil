FROM nginx:alpine

# Copia arquivos estáticos para Nginx
COPY . /usr/share/nginx/html

# Copia configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
