import { Controller, Post, Body, Get, Req, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { UserService } from '../users/users.service'; // Corrected Path
import { GetUser, JwtPayload } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator'; // <-- IMPORT THE NEW DECORATOR

// No @UseGuards at the controller level, as that would protect all routes.
@Controller('auth')
export class AuthController {
  constructor(
      private authService: AuthService,
      private userService: UserService
  ) {}

  /**
   * PUBLIC endpoint to register a new user.
   */
  @Public() // <-- APPLY DECORATOR
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * PUBLIC endpoint to log in a user.
   */
  @Public() // <-- APPLY DECORATOR
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    const tokens = await this.authService.login(user);

    response.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { access_token: tokens.access_token };
  }

  /**
   * PROTECTED endpoint to log out a user.
   * This does NOT get the @Public decorator.
   */
  // @UseGuards(AuthGuard) // This is not needed if AuthGuard is global
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response
  ) {
    await this.authService.logout(user.sub);
    response.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  /**
   * Endpoint to get a new access token. It's public for the AccessTokenGuard,
   * but protected by its own RefreshTokenGuard.
   */
  @Public() // <-- APPLY DECORATOR (to bypass the global AuthGuard)
  @UseGuards(RefreshTokenGuard) // This specific guard will still run
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @GetUser() user: { sub: number },
    @Req() req: Request, 
    @Res({ passthrough: true }) response: Response
  ) {
    const userId = user.sub;
    const refreshToken = req.cookies.refresh_token;
    const tokens = await this.authService.refreshTokens(userId, refreshToken);
    
    response.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { access_token: tokens.access_token };
  }
  
  /**
   * PUBLIC endpoint to request a password reset email.
   */
  @Public() // <-- APPLY DECORATOR
  @Post('password/request-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() requestResetDto: RequestResetDto) {
    return this.authService.requestPasswordReset(requestResetDto.email);
  }

  /**
   * PUBLIC endpoint to reset a password using a token from email.
   */
  @Public() // <-- APPLY DECORATOR
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.new_password);
  }

  /**
   * PROTECTED endpoint to get the profile of the currently authenticated user.
   * This does NOT get the @Public decorator.
   */
  // @UseGuards(AuthGuard) // This is not needed if AuthGuard is global
  @Get('profile')
  async getProfile(@GetUser() user: JwtPayload) {
    return this.userService.findOne(user.sub);
  }
}