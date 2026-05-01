import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  { path: "", redirectTo: "/home", pathMatch: "full" },
  {
    path: "home",
    loadComponent: () =>
      import("./pages/home/home.component").then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },
  {
    path: "explorer",
    loadComponent: () =>
      import("./pages/explorer/explorer.component").then(
        (m) => m.ExplorerComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: "profile/:id",
    loadComponent: () =>
      import("./pages/profile/profile.component").then(
        (m) => m.ProfileComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: "upload",
    loadComponent: () =>
      import("./pages/upload/upload.component").then((m) => m.UploadComponent),
    canActivate: [authGuard],
  },
  {
    path: "live",
    loadComponent: () =>
      import("./pages/live/live.component").then((m) => m.LiveComponent),
    canActivate: [authGuard],
  },
  {
    path: "media",
    redirectTo: "/explorer",
    pathMatch: "full",
  },
  {
    path: "post/new",
    loadComponent: () =>
      import("./pages/post-editor/post-editor.component").then(
        (m) => m.PostEditorComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: "auth/login",
    loadComponent: () =>
      import("./pages/auth/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "auth/register",
    loadComponent: () =>
      import("./pages/auth/register.component").then(
        (m) => m.RegisterComponent,
      ),
  },
  { path: "**", redirectTo: "/home" },
];
