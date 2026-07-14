import axios from "axios";

export const deductCredits = async (

    userId,

    agent

) => {

    try {

        if (!userId) {
            const error = new Error("Missing user session.");
            error.status = 401;
            error.data = {
                success: false,
                title: "Authentication required",
                message: "Please sign in again to continue."
            };
            throw error;
        }

        await axios.patch(

            `${process.env.AUTH_SERVICE}/internal/deduct-credits`,

            {

                userId,

                agent

            }

        );

    }

    catch (error) {

        const response =
            error.response?.data;

        if (error.response?.status === 404) {
            const err = new Error("User not found.");
            err.status = 401;
            err.data = {
                success: false,
                title: "Authentication required",
                message: "User session not found. Please sign in again."
            };
            throw err;
        }

        const err =
            new Error(

                response?.message ||

                "Failed to deduct credits."

            );

        err.status =
            error.response?.status || 500;

        err.data = {

            success: false,

            title:

                response?.title ||

                "Insufficient Credits",

            message:

                response?.message ||

                "You don't have enough credits. Please upgrade your plan."

        };

        throw err;

    }

};