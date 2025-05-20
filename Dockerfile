FROM nginx:alpine

# Copy seluruh konten frontend ke direktori nginx
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Perintah untuk menjalankan nginx
CMD ["nginx", "-g", "daemon off;"]