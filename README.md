# IIC2173-G9-backend

Este documento proporciona las instrucciones básicas para configurar y manejar el entorno del backend para el grupo 9 de IIC2173.

## Docker Compose

### Iniciar Docker Compose
Para iniciar todos los servicios definidos en el `docker-compose.yml` en modo detached, ejecuta:

```bash
docker-compose up -d
```

Para hacer un rebuild:
```bash
docker-compose up -d -build
```

Para borrar todo lo relacionado con docker:
```bash
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume rm $(docker volume ls -q)
docker system prune -a --volumes
```

## Redis
#### Redis ya iniciado
```bash
sudo systemctl stop redis
```


## Docker Bash
#### Encuentrar el ID del contenedor:
```bash
docker ps:
```


#### Accede al contenedor:
```bash
docker exec -it <container_id> bash
```

#### Accede a la base de datos PostgreSQL:
```bash
psql -U postgres -d mydatabase
```
## EsLint
#### Revisar errores con ESLint
```bash
npm run lint
```

#### Corregir errores automaticamente
```bash
npm run lint -- --fix
```



