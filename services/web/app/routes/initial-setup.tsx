import { ActionFunctionArgs, LoaderFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { getUserSession } from "~/features/auth/auth.utils";
import InitialSetup from "~/features/initial-setup/InitialSetup";
import { LibrarySyncMode } from "~/lib/models/User";
import { userService } from "~/lib/services/UserService";


export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const userId = Number(formData.get("userId"));
  if (isNaN(userId)) {
    return Response.json({ success: false, error: "Invalid or missing user ID" }, { status: 400 });
  }

  const batchSize = Number(formData.get("batchSize")) || 5;
  const syncMode = (formData.get("syncMode") as LibrarySyncMode) ?? "manual";

  try {
    await userService.saveUserInitialSetup(userId, { batchSize, syncMode });
    await userService.setUserHasSetupCompleted(userId, true);
    return redirect("/");
  } catch (error) {
    return Response.json(
      { success: false, error: error },
      { status: 500 }
    );
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  const userSession = await getUserSession(request);

  if (userSession) {
    return { userId: userSession.userId };
  }

  return redirect("/");
};

export default function Setup() {
  const { userId } = useLoaderData<{ userId: number | undefined }>();

  return <InitialSetup userId={userId} />;
}