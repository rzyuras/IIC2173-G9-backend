# IIC2173-G9-backend

## Inicial Docker-file:
docker-compose up -d

## Reseteo de Docker-file (¡borrara todo!):
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume rm $(docker volume ls -q)
docker system prune -a --volumes

# EsLint
revisar errores localmente: npm run lint
corregir fix con lint: npm run lint -- --fix