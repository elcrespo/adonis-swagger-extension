export default class UsersController {
    /**
     * @summary Get all users
     * @description Get a list of all users
     * @paramQuery sort - string - Sort by field
     * @responseBody 200 - <UserResponse[]> - List of users
     * @responseBody 404 - <ErrorResponse> - User not found
     * @requestBody <UserRequest>
     */
    public async index() {
        return [];
    }
}
