# KohanaJS core-mvc
The mvc inspired from PHP's Kohana framework's pattern.

## The core mvc defines MVC classes
### Model
Model is simple Javascript Object. Define it for future extension.

### View
View is Adapter for different template engine.
User store data in view.data, then render it to get text.

### Controller
Controller is the class accept request and return response from a client.
It provides 3 stages to execute a request.
1. before()
2. action_XXX()
3. after()

### ControllerMixin
Decorator for Controllers to perform additional functionality
