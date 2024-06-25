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
docker-compose up -d --build
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
docker-compose ps:
```


#### Accede al contenedor:
```bash
docker exec -it <contenedor_name> bash
```

#### Accede a la base de datos PostgreSQL:
```bash
psql -U postgres -d flightsdb
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

## Acceder a la Instancia AWS:

- Servidor: 
```bash
ssh -i "ClaveArqui.pem" ubuntu@ec2-3-142-180-79.us-east-2.compute.amazonaws.com
```

- Worker:
```bash
ssh -i "ClaveArqui.pem" ubuntu@ec2-18-218-127-112.us-east-2.compute.amazonaws.com
```

## Despliegue de Instancia EC2 con Terraform

### Configuración

1. **Proveedores y Versión**
   ```hcl
   terraform {
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 4.16"
       }
     }
     required_version = ">= 1.2.0"
   }
   ```

2. **Proveedor de AWS**
   ```hcl
   provider "aws" {
     region = "us-east-2"
   }
   ```

3. **Recurso: Instancia EC2**
   ```hcl
   resource "aws_instance" "app_server" {
     ami           = "ami-033fabdd332044f06"
     instance_type = "t2.micro"
     tags = {
       Name = "Instancia Levantada con Tf"
     }
   }
   ```

## Comandos

1. **Inicializar**
   ```bash
   terraform init
   ```

2. **Planificar**
   ```bash
   terraform plan
   ```

3. **Aplicar**
   ```bash
   terraform apply -auto-approve
   ```

4. **Destruir**
   ```bash
   terraform destroy -auto-approve
   ```



