cd ..

mkdir -p user-service/{config,controllers,middlewares,models,routes,services,utils,tests/{unit,integration}}

# Tạo các file trong thư mục config
touch user-service/config/{index.js,db.config.js,env.config.js,logger.config.js}

# Tạo các file trong thư mục controllers
touch user-service/controllers/{auth.controller.js,user.controller.js,role.controller.js,permission.controller.js,employee.controller.js,error.controller.js}

# Tạo các file trong thư mục middlewares
touch user-service/middlewares/{auth.middleware.js,error.middleware.js,validate.middleware.js,audit.middleware.js}

# Tạo các file trong thư mục models
touch user-service/models/{index.js,user.model.js,role.model.js,permission.model.js,employee.model.js,auditLog.model.js}

# Tạo các file trong thư mục routes
touch user-service/routes/{index.js,auth.routes.js,user.routes.js,role.routes.js,permission.routes.js,employee.routes.js}

# Tạo các file trong thư mục services
touch user-service/services/{auth.service.js,user.service.js,role.service.js,permission.service.js,employee.service.js,audit.service.js}

# Tạo các file trong thư mục utils
touch user-service/utils/{appError.js,apiFeatures.js,catchAsync.js,logger.js,password.util.js}

# Tạo các file root
touch user-service/{.env,.env.example,.gitignore,Dockerfile,app.js,package.json,package-lock.json,server.js}
