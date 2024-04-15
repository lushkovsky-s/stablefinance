provider "aws" {
  region = "us-east-1" # TODO: Specify zones
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "nestjs-app-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"] # TODO: Specify zones
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.3.0/24", "10.0.4.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "nestjs-cluster"
  cluster_version = "1.21"
  subnets         = module.vpc.private_subnets
  vpc_id          = module.vpc.vpc_id

  node_groups = {
    ng1 = {
      desired_capacity = 2
      max_capacity     = 3
      min_capacity     = 1

      instance_type = "m5.large"
    }
  }
}

module "aurora" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "~> 4.0"

  name             = "nestjsdb"
  engine           = "aurora-postgresql"
  engine_version   = "11.9"
  instance_type    = "db.r5.large"
  password         = var.db_password 
  subnet_ids       = module.vpc.private_subnets
  vpc_id           = module.vpc.vpc_id
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "dbCredentials"
  description = "Database credentials for NestJS app"
}

resource "aws_secretsmanager_secret_version" "db_credentials_version" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "dbuser"
    password = "CHANGE_ME" # TODO
  })
}

# DataDog 
# Security Groups, IAM Roles, Policies, etc..

