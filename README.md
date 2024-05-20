# IIC2173-G9-backend

Este documento proporciona las instrucciones básicas para configurar y manejar el entorno del backend para el grupo 9 de IIC2173.

## Docker Compose

### Iniciar Docker Compose
Para iniciar todos los servicios definidos en el `docker-compose.yml` en modo detached, ejecuta:

```bash
docker-compose up -d
```

Para borrar todo lo relacionado con docker:
```bash
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume rm $(docker volume ls -q)
docker system prune -a --volumes
```

### Lint

## Revisar errores con ESLint
Para revisar errores de ESLint en el entorno local se debe utilizar:
```bash
npm run lint
```

 ## Corregir errores automaticamente
```bash
npm run lint -- --fix
```

