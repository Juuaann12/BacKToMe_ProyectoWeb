FROM nginx:alpine

# Copia el contenido del proyecto al directorio de Nginx
COPY . /usr/share/nginx/html

# Expone el puerto standard de Nginx
EXPOSE 80

# Usa el comando por defecto de Nginx
