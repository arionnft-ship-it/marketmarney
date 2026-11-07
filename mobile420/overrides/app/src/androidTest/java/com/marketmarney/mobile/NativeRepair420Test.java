package com.marketmarney.mobile;

import org.junit.Test;
import static org.junit.Assert.assertEquals;

/** Recovery policy only: no Activity, network, account, or user data is required. */
public class NativeRepair420Test {
    private static final String BASE="https://marketmarney.com";
    private static final String FALLBACK=BASE+"/index.html";

    @Test public void btcAndOilRetryPreservesSceneOptions(){
        for(String path:new String[]{"/assets/btc-war-3d.html","/assets/oil-war-3d.html"}){
            String attempted=BASE+path+"?v=9.0&view=drone#arena";
            assertEquals("Retry must reopen the failed scene",attempted,Recovery414.safeRetry(attempted,FALLBACK));
        }
    }

    @Test public void sceneRecoveryNeverReplaysMutationOrAuthRoutes(){
        for(String path:new String[]{
            "/api/community/logout",
            "/api/trader-profiles/posts",
            "/api/trader-connect/group-messages",
            "/api/social-video/like",
            "/api/auth/google/start",
            "/api/auth/google/callback?code=synthetic",
            "/api/auth/android/google"
        }){
            assertEquals(path,FALLBACK,Recovery414.safeRetry(BASE+path,FALLBACK));
        }
    }

    @Test public void sceneAllowlistDoesNotAcceptUnknownOrNestedRoutes(){
        for(String path:new String[]{
            "/assets/btc-war-3d.html/logout",
            "/assets/oil-war-3d.html/delete",
            "/assets/other-war-3d.html",
            "/assets/../api/community/logout"
        }){
            assertEquals(path,FALLBACK,Recovery414.safeRetry(BASE+path,FALLBACK));
        }
    }

    @Test public void sceneRetryCannotLeaveTheTrustedOrigin(){
        for(String attempted:new String[]{
            "http://marketmarney.com/assets/btc-war-3d.html",
            "https://marketmarney.com.example/assets/oil-war-3d.html",
            "https://user@marketmarney.com/assets/btc-war-3d.html",
            "https://marketmarney.com:444/assets/oil-war-3d.html"
        }){
            assertEquals(attempted,FALLBACK,Recovery414.safeRetry(attempted,FALLBACK));
        }
    }
}
